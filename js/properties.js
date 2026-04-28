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
  const card = el('div', { className: 'property-card', onClick: () => navigateTo(`#/property/${id}`) }, [
    el('div', { className: 'property-card-img-container' }, [
      data.image_url
        ? el('img', { className: 'property-card-img', src: data.image_url, alt: data.name })
        : el('div', { className: 'property-card-img placeholder', style: 'display:flex;align-items:center;justify-content:center;font-size:48px;', textContent: '🏠' })
    ]),
    el('div', { className: 'property-card-body' }, [
      el('div', { className: 'property-card-header' }, [
        el('h3', { textContent: data.name })
      ]),
      el('button', { className: 'btn btn-outline view-details-btn', style: 'margin-top: 16px;', textContent: 'View Details' })
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

// Init event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fab-add-property').addEventListener('click', openAddPropertyModal);
  document.getElementById('add-property-close').addEventListener('click', closeAddPropertyModal);

  document.getElementById('save-property-btn').addEventListener('click', saveProperty);
  document.getElementById('prop-image-file').addEventListener('change', handlePropertyImageSelect);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Close modal on overlay click
  document.getElementById('add-property-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddPropertyModal();
  });
});
