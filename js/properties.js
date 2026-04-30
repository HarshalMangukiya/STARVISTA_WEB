// ===== Properties Module =====

async function loadProperties() {
  const grid = document.getElementById('properties-grid');
  const user = auth.currentUser;
  if (!user) return;

  grid.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

  try {
    const snap = await db.collection('properties')
      .where('owner_id', '==', user.uid)
      .get();

    if (snap.empty) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="icon">🏠</div>
          <h3>No properties yet</h3>
          <p>Click the + button to add your first hostel</p>
        </div>`;
      return;
    }

    grid.innerHTML = '';
    snap.forEach(doc => {
      const data = doc.data();
      const card = createPropertyCard(doc.id, data);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading properties:', err);
    showToast('Failed to load properties', 'error');
  }
}

function createPropertyCard(id, data) {
  // Create edit button with direct DOM methods
  const editBtn = document.createElement('button');
  editBtn.className = 'card-icon-btn edit-property-btn';
  editBtn.title = 'Edit Property';
  editBtn.type = 'button';
  editBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
  editBtn.addEventListener('click', (e) => {
    console.log('Edit button clicked for property:', id, data);
    e.preventDefault();
    e.stopPropagation();
    openEditPropertyModal(id, data);
  });

  // Create delete button with direct DOM methods
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-icon-btn delete-property-btn';
  deleteBtn.title = 'Delete Property';
  deleteBtn.type = 'button';
  deleteBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openDeletePropertyModal(id, data.name);
  });

  // Create icon container
  const iconContainer = document.createElement('div');
  iconContainer.className = 'property-card-icons';
  iconContainer.appendChild(editBtn);
  iconContainer.appendChild(deleteBtn);

  // Create card with el() helper
  const card = el('div', { className: 'property-card' }, [
    el('div', { className: 'property-card-img-container', onClick: () => navigateTo(`#/property/${id}`) }, [
      data.image_url
        ? el('img', { className: 'property-card-img', src: data.image_url, alt: data.name })
        : el('div', { className: 'property-card-img placeholder', style: 'display:flex;align-items:center;justify-content:center;font-size:48px;', textContent: '🏠' })
    ]),
    el('div', { className: 'property-card-body' }, [
      el('div', { className: 'property-card-header' }, [
        el('h3', { textContent: data.name })
      ]),
      el('div', { className: 'property-card-actions' }, [
        el('button', { className: 'btn btn-outline view-details-btn', textContent: 'View Details', onClick: (e) => { e.stopPropagation(); navigateTo(`#/property/${id}`); } }),
        iconContainer  // Use the native DOM button container
      ])
    ])
  ]);
  return card;
}

// ===== Add Property Modal =====
function openAddPropertyModal() {
  const overlay = document.getElementById('add-property-modal');
  overlay.classList.add('active');
  resetAddPropertyForm();
}

function closeAddPropertyModal() {
  const overlay = document.getElementById('add-property-modal');
  overlay.classList.remove('active');
}

function resetAddPropertyForm() {
  document.getElementById('prop-name').value = '';
  document.getElementById('prop-desc').value = '';
  const preview = document.getElementById('prop-image-preview');
  const fileInput = document.getElementById('prop-image-file');
  // Remove any preview image but keep the file input
  preview.innerHTML = '<div class="upload-icon">📷</div><div class="upload-text">Click to upload hostel image</div>';
  preview.appendChild(fileInput);
  fileInput.value = '';
  window._selectedPropertyImage = null;
}

function handlePropertyImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  window._selectedPropertyImage = file;
  const preview = document.getElementById('prop-image-preview');
  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.innerHTML = `<img src="${ev.target.result}" alt="preview" />`;
  };
  reader.readAsDataURL(file);
}

async function saveProperty() {
  const name = document.getElementById('prop-name').value.trim();
  const desc = document.getElementById('prop-desc').value.trim();

  if (!name) {
    showToast('Please enter a property name', 'error');
    return;
  }



  const saveBtn = document.getElementById('save-property-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    let imageUrl = '';
    if (window._selectedPropertyImage) {
      imageUrl = await uploadToCloudinary(window._selectedPropertyImage);
    }

    const propRef = await db.collection('properties').add({
      name: name,
      description: desc,
      image_url: imageUrl,
      owner_id: auth.currentUser.uid,
      total_rooms: 0,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('Property added successfully!');
    closeAddPropertyModal();
    loadProperties();
  } catch (err) {
    console.error('Error saving property:', err);
    showToast('Failed to save property', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Property';
  }
}

// Logout
function handleLogout() {
  auth.signOut();
}

// ===== Edit Property Modal =====
let editPropertyData = {
  id: null,
  data: null
};

function openEditPropertyModal(id, data) {
  console.log('openEditPropertyModal called with:', id, data);
  
  editPropertyData = { id, data: { ...data } };
  
  try {
    document.getElementById('edit-prop-name').value = data.name;
    document.getElementById('edit-prop-desc').value = data.description || '';
    
    const preview = document.getElementById('edit-prop-image-preview');
    const fileInput = document.getElementById('edit-prop-image-file');
    
    // Clear preview but keep the file input
    preview.innerHTML = '';
    
    if (data.image_url) {
      const img = document.createElement('img');
      img.src = data.image_url;
      img.alt = 'preview';
      preview.appendChild(img);
    } else {
      const icon = document.createElement('div');
      icon.className = 'upload-icon';
      icon.textContent = '📷';
      
      const text = document.createElement('div');
      text.className = 'upload-text';
      text.textContent = 'Click to upload hostel image';
      
      preview.appendChild(icon);
      preview.appendChild(text);
    }
    
    // Re-append the file input
    preview.appendChild(fileInput);
    fileInput.value = '';
    window._selectedEditPropertyImage = null;
    
    const modal = document.getElementById('edit-property-modal');
    console.log('Modal element found:', modal);
    modal.classList.add('active');
    console.log('Modal active class added, should be visible now');
  } catch (error) {
    console.error('Error in openEditPropertyModal:', error);
  }
}

function closeEditPropertyModal() {
  document.getElementById('edit-property-modal').classList.remove('active');
  editPropertyData = { id: null, data: null };
}

function handleEditPropertyImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  window._selectedEditPropertyImage = file;
  const preview = document.getElementById('edit-prop-image-preview');
  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.innerHTML = `<img src="${ev.target.result}" alt="preview" />`;
  };
  reader.readAsDataURL(file);
}

async function saveEditedProperty() {
  const name = document.getElementById('edit-prop-name').value.trim();
  const desc = document.getElementById('edit-prop-desc').value.trim();

  if (!name) {
    showToast('Please enter a property name', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-edit-property-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    let imageUrl = editPropertyData.data.image_url || '';
    if (window._selectedEditPropertyImage) {
      imageUrl = await uploadToCloudinary(window._selectedEditPropertyImage);
    }

    await db.collection('properties').doc(editPropertyData.id).update({
      name: name,
      description: desc,
      image_url: imageUrl
    });

    showToast('Property updated successfully!', 'success');
    closeEditPropertyModal();
    loadProperties();
  } catch (err) {
    console.error('Error updating property:', err);
    showToast('Failed to update property', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

// ===== Delete Property Modal =====
let deletePropertyData = {
  id: null,
  name: null
};

function openDeletePropertyModal(id, name) {
  deletePropertyData = { id, name };
  document.getElementById('delete-property-name').textContent = name;
  document.getElementById('delete-property-modal').classList.add('active');
}

function closeDeletePropertyModal() {
  document.getElementById('delete-property-modal').classList.remove('active');
  deletePropertyData = { id: null, name: null };
}

async function confirmDeleteProperty() {
  const confirmBtn = document.getElementById('delete-property-confirm');
  confirmBtn.disabled = true;
  
  const textSpan = document.getElementById('delete-prop-btn-text');
  const loader = document.getElementById('delete-prop-loader');
  textSpan.style.display = 'none';
  loader.style.display = 'inline-block';

  try {
    // Delete all rooms and residents first
    const roomsSnap = await db.collection('properties')
      .doc(deletePropertyData.id)
      .collection('rooms')
      .get();

    for (const roomDoc of roomsSnap.docs) {
      // Delete all residents in each room
      const residentsSnap = await db.collection('properties')
        .doc(deletePropertyData.id)
        .collection('rooms')
        .doc(roomDoc.id)
        .collection('residents')
        .get();

      for (const residentDoc of residentsSnap.docs) {
        await db.collection('properties')
          .doc(deletePropertyData.id)
          .collection('rooms')
          .doc(roomDoc.id)
          .collection('residents')
          .doc(residentDoc.id)
          .delete();
      }

      // Delete the room
      await db.collection('properties')
        .doc(deletePropertyData.id)
        .collection('rooms')
        .doc(roomDoc.id)
        .delete();
    }

    // Delete the property
    await db.collection('properties').doc(deletePropertyData.id).delete();

    showToast('Property deleted successfully!', 'success');
    closeDeletePropertyModal();
    loadProperties();
  } catch (err) {
    console.error('Error deleting property:', err);
    showToast('Failed to delete property', 'error');
    
    confirmBtn.disabled = false;
    textSpan.style.display = 'inline';
    loader.style.display = 'none';
  }
}

// Init event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded - properties.js initialized');
  console.log('Edit modal element:', document.getElementById('edit-property-modal'));
  
  document.getElementById('fab-add-property').addEventListener('click', openAddPropertyModal);
  document.getElementById('add-property-close').addEventListener('click', closeAddPropertyModal);

  document.getElementById('save-property-btn').addEventListener('click', saveProperty);
  document.getElementById('prop-image-file').addEventListener('change', handlePropertyImageSelect);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Close modal on overlay click
  document.getElementById('add-property-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddPropertyModal();
  });

  // Edit Property modal
  if (document.getElementById('edit-property-close')) {
    document.getElementById('edit-property-close').addEventListener('click', closeEditPropertyModal);
    document.getElementById('edit-property-cancel').addEventListener('click', closeEditPropertyModal);
    document.getElementById('save-edit-property-btn').addEventListener('click', saveEditedProperty);
    document.getElementById('edit-prop-image-file').addEventListener('change', handleEditPropertyImageSelect);
    document.getElementById('edit-property-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeEditPropertyModal();
    });
  }

  // Delete Property modal
  if (document.getElementById('delete-property-modal')) {
    document.getElementById('delete-property-close').addEventListener('click', closeDeletePropertyModal);
    document.getElementById('delete-property-cancel').addEventListener('click', closeDeletePropertyModal);
    document.getElementById('delete-property-confirm').addEventListener('click', confirmDeleteProperty);
    document.getElementById('delete-property-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeDeletePropertyModal();
    });
  }
});
