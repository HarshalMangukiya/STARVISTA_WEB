// ===== Property Detail Module =====

let currentPropertyId = null;
let currentPropertyData = null;
let currentRooms = []; // { id, data, residents: [{id, data}] }

async function loadPropertyDetail(propertyId) {
  currentPropertyId = propertyId;
  const header = document.getElementById('detail-title');
  const tableBody = document.getElementById('residents-body');

  header.textContent = 'Loading...';
  tableBody.innerHTML = '<tr><td colspan="7"><div class="loader"><div class="spinner"></div></div></td></tr>';

  try {
    // Load property
    const propDoc = await db.collection('properties').doc(propertyId).get();
    if (!propDoc.exists) {
      showToast('Property not found', 'error');
      navigateTo('#/properties');
      return;
    }
    currentPropertyData = propDoc.data();
    header.textContent = currentPropertyData.name;

    // Load rooms
    const roomsSnap = await db.collection('properties').doc(propertyId)
      .collection('rooms').orderBy('room_no').get();

    currentRooms = [];
    for (const roomDoc of roomsSnap.docs) {
      const residentsSnap = await db.collection('properties').doc(propertyId)
        .collection('rooms').doc(roomDoc.id)
        .collection('residents').get();

      const residents = residentsSnap.docs.map(r => ({ id: r.id, data: r.data() }));
      currentRooms.push({ id: roomDoc.id, data: roomDoc.data(), residents });
    }

    renderResidentsTable();
  } catch (err) {
    console.error('Error loading property detail:', err);
    showToast('Failed to load property details', 'error');
  }
}

function renderResidentsTable() {
  const tableBody = document.getElementById('residents-body');
  tableBody.innerHTML = '';

  if (currentRooms.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="icon">🛏️</div><h3>No rooms configured</h3></div></td></tr>';
    return;
  }

  currentRooms.forEach((room, roomIdx) => {
    // Add room gap before each room (except first)
    if (roomIdx > 0) {
      const gapRow = el('tr', { className: 'room-gap' }, [el('td', { colspan: '7' })]);
      tableBody.appendChild(gapRow);
    }

    const occupiedCount = room.residents.length;
    const emptyBeds = room.data.capacity - occupiedCount;

    // Resident rows
    room.residents.forEach((resident, resIdx) => {
      const status = getPaymentStatus(resident.data.end_date);
      const row = el('tr', {}, [
        // Room — only show on first row of this room
        el('td', {
          className: 'editable-cell',
          textContent: resIdx === 0 ? `Room ${room.data.room_no}` : '',
          style: resIdx === 0 ? 'font-weight:600;color:var(--accent-hover);' : '',
          'data-tooltip': 'Click to Edit',
          onClick: () => resIdx === 0 && openEditFieldModal('room_no', room.id, resident.id, resident.data, room.data.room_no)
        }),
        // Name
        el('td', { 
          className: 'name-cell editable-cell', 
          textContent: resident.data.name,
          'data-tooltip': 'Click to Edit',
          onClick: () => openEditFieldModal('name', room.id, resident.id, resident.data, resident.data.name)
        }),
        // Contact
        el('td', {
          className: 'contact-cell'
        }, [
          el('div', { 
            className: 'contact-container',
            onClick: (e) => {
              // Only open edit if clicking on the phone span, not the WhatsApp button
              if (!e.target.closest('.whatsapp-btn')) {
                openEditFieldModal('phone', room.id, resident.id, resident.data, resident.data.phone || '');
              }
            }
          }, [
            el('div', { className: 'contact-phone' }, [
              el('span', { textContent: resident.data.phone || '—' })
            ]),
            // WhatsApp button - only show for UPCOMING status
            ...(status === 'upcoming' && resident.data.phone ? [
              el('button', {
                className: 'whatsapp-btn',
                title: 'Send Payment Reminder',
                'aria-label': 'Send WhatsApp reminder',
                onClick: (e) => {
                  e.stopPropagation();
                  handleWhatsAppReminder(resident.data, room.data);
                }
              }, [
                el('img', {
                  src: 'icon/whatsapp.png',
                  alt: 'WhatsApp',
                  style: 'width: 18px; height: 18px; display: block;'
                })
              ])
            ] : [])
          ])
        ]),
        // Start Date
        el('td', {
          className: 'editable-cell',
          'data-tooltip': 'Click to Edit',
          onClick: () => openEditFieldModal('start_date', room.id, resident.id, resident.data, resident.data.start_date)
        }, [
          el('div', { className: 'date-range' }, [
            el('span', { className: 'dot dot-blue' }),
            el('span', { textContent: ' ' + formatDate(resident.data.start_date) })
          ])
        ]),
        // End Date
        el('td', {
          className: 'editable-cell',
          'data-tooltip': 'Click to Edit',
          onClick: () => openEditFieldModal('end_date', room.id, resident.id, resident.data, resident.data.end_date),
          style: 'color:var(--text-muted);'
        }, [
          el('div', { className: 'date-range' }, [
            el('span', { className: 'dot dot-red' }),
            el('span', { textContent: ' ' + formatDate(resident.data.end_date) })
          ])
        ]),
        // Payment status
        el('td', {}, [
          el('span', {
            className: `badge badge-${status}`,
            textContent: status,
            onClick: () => openPaymentModal(room.id, resident.id, resident.data)
          })
        ]),
        // Remark
        el('td', { 
          className: 'editable-cell',
          textContent: resident.data.remarks || '—', 
          style: 'color:var(--text-secondary);max-width:150px;overflow:hidden;text-overflow:ellipsis;',
          'data-tooltip': 'Click to Edit',
          onClick: () => openEditFieldModal('remarks', room.id, resident.id, resident.data, resident.data.remarks || '')
        }),
        // Delete Button
        el('td', { style: 'text-align: center;' }, [
          el('button', {
            className: 'delete-btn',
            title: 'Delete Resident',
            innerHTML: '🗑️',
            onClick: (e) => {
              e.stopPropagation();
              openDeleteResidentModal(room.id, resident.id, resident.data);
            }
          })
        ])
      ]);
      tableBody.appendChild(row);
    });

    // Empty bed rows
    for (let i = 0; i < emptyBeds; i++) {
      const emptyRow = el('tr', { className: 'empty-bed-row' }, [
        el('td', {
          textContent: (occupiedCount === 0 && i === 0) ? `Room ${room.data.room_no}` : '',
          style: (occupiedCount === 0 && i === 0) ? 'font-weight:600;color:var(--accent-hover);' : ''
        }),
        el('td', { colspan: '7' }, [
          el('button', {
            className: 'add-resident-btn',
            innerHTML: '+ Add Resident',
            onClick: () => openAddResidentModal(room.id, room.data)
          })
        ])
      ]);
      tableBody.appendChild(emptyRow);
    }
  });
}

// ===== Payment Update Modal =====
let paymentRoomId = null;
let paymentResidentId = null;
let paymentResidentData = null;

function openPaymentModal(roomId, residentId, residentData) {
  paymentRoomId = roomId;
  paymentResidentId = residentId;
  paymentResidentData = residentData;

  const overlay = document.getElementById('payment-modal');
  document.getElementById('payment-resident-name').textContent = residentData.name;

  const startDate = residentData.end_date ? (residentData.end_date instanceof Date ? residentData.end_date : residentData.end_date.toDate()) : new Date();
  document.getElementById('payment-start').value = formatDateForInput(startDate);
  document.getElementById('payment-end').value = '';

  // Deselect quick buttons
  document.querySelectorAll('.payment-quick-btns .btn').forEach(b => b.classList.remove('active'));

  overlay.classList.add('active');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.remove('active');
}

function handlePaymentQuickBtn(months) {
  // Highlight active
  document.querySelectorAll('.payment-quick-btns .btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  const startDate = paymentResidentData.end_date
    ? (paymentResidentData.end_date instanceof Date ? paymentResidentData.end_date : paymentResidentData.end_date.toDate())
    : new Date();

  document.getElementById('payment-start').value = formatDateForInput(startDate);

  if (months === 'custom') {
    document.getElementById('payment-end').value = '';
    document.getElementById('payment-end').focus();
  } else {
    const endDate = addMonths(startDate, months);
    document.getElementById('payment-end').value = formatDateForInput(endDate);
  }
}

async function savePaymentUpdate() {
  const startVal = document.getElementById('payment-start').value;
  const endVal = document.getElementById('payment-end').value;

  if (!startVal || !endVal) {
    showToast('Please select both start and end dates', 'error');
    return;
  }

  const btn = document.getElementById('save-payment-btn');
  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    await db.collection('properties').doc(currentPropertyId)
      .collection('rooms').doc(paymentRoomId)
      .collection('residents').doc(paymentResidentId)
      .update({
        start_date: new Date(startVal),
        end_date: new Date(endVal)
      });

    // Optimistic update: update in memory for instant UI
    const room = currentRooms.find(r => r.id === paymentRoomId);
    const resident = room?.residents.find(r => r.id === paymentResidentId);
    if (resident) {
      resident.data.start_date = new Date(startVal);
      resident.data.end_date = new Date(endVal);
    }
    
    showToast('Payment updated!');
    closePaymentModal();
    renderResidentsTable(); // Fast re-render instead of full reload
  } catch (err) {
    console.error('Error updating payment:', err);
    showToast('Failed to update payment', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update';
  }
}

// ===== Add Resident Modal =====
let addResidentRoomId = null;
let addResidentRoomData = null;

function openAddResidentModal(roomId, roomData) {
  addResidentRoomId = roomId;
  addResidentRoomData = roomData;

  const overlay = document.getElementById('add-resident-modal');
  document.getElementById('resident-room-label').textContent = `Room ${roomData.room_no} — ₹${roomData.monthly_rent}/month`;
  document.getElementById('res-name').value = '';
  document.getElementById('res-email').value = '';
  document.getElementById('res-phone').value = '';
  document.getElementById('res-gender').value = 'male';
  document.getElementById('res-start').value = formatDateForInput(new Date());
  document.getElementById('res-end').value = formatDateForInput(addMonths(new Date(), 1));
  document.getElementById('res-remarks').value = '';

  overlay.classList.add('active');
}

function closeAddResidentModal() {
  document.getElementById('add-resident-modal').classList.remove('active');
}

async function saveResident() {
  const name = document.getElementById('res-name').value.trim();
  const email = document.getElementById('res-email').value.trim();
  const phone = document.getElementById('res-phone').value.trim();
  const gender = document.getElementById('res-gender').value;
  const startDate = document.getElementById('res-start').value;
  const endDate = document.getElementById('res-end').value;
  const remarks = document.getElementById('res-remarks').value.trim();

  if (!name) {
    showToast('Please enter resident name', 'error');
    return;
  }
  if (!startDate || !endDate) {
    showToast('Please select start and end dates', 'error');
    return;
  }

  const btn = document.getElementById('save-resident-btn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const resRef = await db.collection('properties').doc(currentPropertyId)
      .collection('rooms').doc(addResidentRoomId)
      .collection('residents').add({
        name,
        email,
        phone,
        gender,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        remarks
      });

    // Add to memory for instant UI
    const room = currentRooms.find(r => r.id === addResidentRoomId);
    if (room) {
      room.residents.push({
        id: resRef.id,
        data: { name, email, phone, gender, start_date: new Date(startDate), end_date: new Date(endDate), remarks }
      });
    }
    
    showToast('Resident added!');
    closeAddResidentModal();
    renderResidentsTable(); // Fast re-render
  } catch (err) {
    console.error('Error adding resident:', err);
    showToast('Failed to add resident', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Resident';
  }
}

// ===== Add Room Modal =====
function openAddRoomModal() {
  document.getElementById('add-room-modal').classList.add('active');
  document.getElementById('new-room-no').value = '';
  document.getElementById('new-room-cap').value = '';
  document.getElementById('new-room-rent').value = '';
}

function closeAddRoomModal() {
  document.getElementById('add-room-modal').classList.remove('active');
}

async function saveRoom() {
  const roomNo = document.getElementById('new-room-no').value.trim();
  const cap = parseInt(document.getElementById('new-room-cap').value) || 0;
  const rent = parseInt(document.getElementById('new-room-rent').value) || 0;

  if (!roomNo || cap <= 0) {
    showToast('Please enter room number and valid capacity', 'error');
    return;
  }

  const btn = document.getElementById('save-room-btn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const roomRef = await db.collection('properties').doc(currentPropertyId)
      .collection('rooms').add({
        room_no: roomNo,
        capacity: cap,
        monthly_rent: rent
      });
      
    // Add to memory and sort for instant UI
    currentRooms.push({
      id: roomRef.id,
      data: { room_no: roomNo, capacity: cap, monthly_rent: rent },
      residents: []
    });
    currentRooms.sort((a, b) => parseInt(a.data.room_no) - parseInt(b.data.room_no));
    
    // Update the total_rooms count
    await db.collection('properties').doc(currentPropertyId).update({
      total_rooms: firebase.firestore.FieldValue.increment(1)
    });

    showToast('Room added successfully!');
    closeAddRoomModal();
    renderResidentsTable(); // Fast re-render
  } catch (err) {
    console.error('Error adding room:', err);
    showToast('Failed to add room', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Room';
  }
}

// ===== Edit Field Modal =====
let editFieldData = {
  field: null,
  roomId: null,
  residentId: null,
  residentData: null,
  value: null
};

function openEditFieldModal(field, roomId, residentId, residentData, value) {
  editFieldData = { field, roomId, residentId, residentData, value };
  
  const overlay = document.getElementById('edit-field-modal');
  const title = document.getElementById('edit-field-title');
  
  // Hide all field forms
  document.querySelectorAll('.edit-field-form').forEach(f => f.classList.remove('active'));
  
  // Show appropriate field form and set title
  switch(field) {
    case 'room_no':
      title.textContent = 'Edit Room Number';
      document.getElementById('edit-room-field').classList.add('active');
      document.getElementById('edit-room-input').value = value;
      setTimeout(() => document.getElementById('edit-room-input').focus(), 100);
      break;
      
    case 'name':
      title.textContent = 'Edit Resident Name';
      document.getElementById('edit-name-field').classList.add('active');
      document.getElementById('edit-name-input').value = value;
      setTimeout(() => document.getElementById('edit-name-input').focus(), 100);
      break;
      
    case 'phone':
      title.textContent = 'Edit Contact Number';
      document.getElementById('edit-contact-field').classList.add('active');
      document.getElementById('edit-contact-input').value = value;
      setTimeout(() => document.getElementById('edit-contact-input').focus(), 100);
      break;
      
    case 'start_date':
      title.textContent = 'Edit Start Date';
      document.getElementById('edit-start-date-field').classList.add('active');
      const startDate = value instanceof Date ? value : value?.toDate?.() || new Date(value);
      document.getElementById('edit-start-date-input').value = formatDateForInput(startDate);
      setTimeout(() => document.getElementById('edit-start-date-input').focus(), 100);
      break;
      
    case 'end_date':
      title.textContent = 'Edit End Date';
      document.getElementById('edit-end-date-field').classList.add('active');
      const endDate = value instanceof Date ? value : value?.toDate?.() || new Date(value);
      document.getElementById('edit-end-date-input').value = formatDateForInput(endDate);
      setTimeout(() => document.getElementById('edit-end-date-input').focus(), 100);
      break;
      
    case 'remarks':
      title.textContent = 'Edit Remark';
      document.getElementById('edit-remark-field').classList.add('active');
      const remarkInput = document.getElementById('edit-remark-input');
      remarkInput.value = value;
      updateRemarkCount();
      setTimeout(() => remarkInput.focus(), 100);
      break;
  }
  
  overlay.classList.add('active');
}

function closeEditFieldModal() {
  document.getElementById('edit-field-modal').classList.remove('active');
  editFieldData = { field: null, roomId: null, residentId: null, residentData: null, value: null };
}

function updateRemarkCount() {
  const input = document.getElementById('edit-remark-input');
  const count = document.getElementById('remark-count');
  count.textContent = `${input.value.length}/500 characters`;
}

function validateEditField() {
  const field = editFieldData.field;
  let value = '';
  let error = '';
  
  switch(field) {
    case 'room_no':
      value = document.getElementById('edit-room-input').value.trim();
      if (!value) error = 'Room number cannot be empty';
      break;
      
    case 'name':
      value = document.getElementById('edit-name-input').value.trim();
      if (!value) error = 'Name cannot be empty';
      break;
      
    case 'phone':
      value = document.getElementById('edit-contact-input').value.trim();
      if (value && !/^\d+$/.test(value.replace(/[\s\-]/g, ''))) {
        error = 'Contact number must contain only digits';
      }
      break;
      
    case 'start_date':
      value = document.getElementById('edit-start-date-input').value;
      if (!value) error = 'Start date is required';
      break;
      
    case 'end_date':
      value = document.getElementById('edit-end-date-input').value;
      if (!value) error = 'End date is required';
      const startDate = new Date(editFieldData.residentData.start_date instanceof Date 
        ? editFieldData.residentData.start_date 
        : editFieldData.residentData.start_date?.toDate?.() || editFieldData.residentData.start_date);
      const endDate = new Date(value);
      if (endDate < startDate) {
        error = 'End date cannot be before start date';
      }
      break;
      
    case 'remarks':
      value = document.getElementById('edit-remark-input').value.trim();
      break;
  }
  
  if (error) {
    showToast(error, 'error');
    return null;
  }
  
  return value;
}

async function saveEditedField() {
  const value = validateEditField();
  if (value === null) return;
  
  const btn = document.getElementById('edit-field-confirm');
  btn.disabled = true;
  btn.textContent = 'Updating...';
  
  try {
    const updateData = {};
    const field = editFieldData.field;
    
    if (field === 'room_no') {
      // Update room number
      const room = currentRooms.find(r => r.id === editFieldData.roomId);
      if (room) room.data.room_no = value;
      
      await db.collection('properties').doc(currentPropertyId)
        .collection('rooms').doc(editFieldData.roomId)
        .update({ room_no: value });
    } else {
      // Update resident field
      const room = currentRooms.find(r => r.id === editFieldData.roomId);
      const resident = room?.residents.find(r => r.id === editFieldData.residentId);
      
      if (field === 'start_date' || field === 'end_date') {
        updateData[field] = new Date(value);
        if (resident) resident.data[field] = new Date(value);
      } else {
        updateData[field] = value;
        if (resident) resident.data[field] = value;
      }
      
      await db.collection('properties').doc(currentPropertyId)
        .collection('rooms').doc(editFieldData.roomId)
        .collection('residents').doc(editFieldData.residentId)
        .update(updateData);
    }
    
    showToast('Data Updated Successfully', 'success');
    closeEditFieldModal();
    renderResidentsTable(); // Fast re-render
  } catch (err) {
    console.error('Error updating field:', err);
    showToast('Failed to update data', 'error');
    loadPropertyDetail(currentPropertyId); // Full reload on error
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Update';
  }
}

// ===== Delete Resident Modal =====
let deleteResidentData = {
  roomId: null,
  residentId: null,
  residentData: null
};

function openDeleteResidentModal(roomId, residentId, residentData) {
  deleteResidentData = { roomId, residentId, residentData };
  
  const modal = document.getElementById('delete-resident-modal');
  document.getElementById('delete-resident-name').textContent = residentData.name;
  
  // Reset button state
  const confirmBtn = document.getElementById('delete-resident-confirm');
  confirmBtn.disabled = false;
  document.getElementById('delete-btn-text').style.display = 'inline';
  document.getElementById('delete-btn-loader').style.display = 'none';
  
  modal.classList.add('active');
}

function closeDeleteResidentModal() {
  document.getElementById('delete-resident-modal').classList.remove('active');
  deleteResidentData = { roomId: null, residentId: null, residentData: null };
}

async function confirmDeleteResident() {
  const confirmBtn = document.getElementById('delete-resident-confirm');
  const textSpan = document.getElementById('delete-btn-text');
  const loader = document.getElementById('delete-btn-loader');
  
  // Show loading state
  confirmBtn.disabled = true;
  textSpan.style.display = 'none';
  loader.style.display = 'inline-block';
  
  try {
    // Delete from Firebase
    await db.collection('properties').doc(currentPropertyId)
      .collection('rooms').doc(deleteResidentData.roomId)
      .collection('residents').doc(deleteResidentData.residentId)
      .delete();
    
    // Remove from memory
    const room = currentRooms.find(r => r.id === deleteResidentData.roomId);
    if (room) {
      room.residents = room.residents.filter(r => r.id !== deleteResidentData.residentId);
    }
    
    showToast('Resident deleted successfully!', 'success');
    closeDeleteResidentModal();
    renderResidentsTable(); // Re-render table
    
  } catch (err) {
    console.error('Error deleting resident:', err);
    showToast('Failed to delete resident', 'error');
    
    // Reset button state on error
    confirmBtn.disabled = false;
    textSpan.style.display = 'inline';
    loader.style.display = 'none';
  }
}

// ===== WhatsApp Reminder Functions =====

/**
 * Validate phone number format (Indian)
 * Accepts 10 digits, with or without +91 prefix
 */
function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 12;
}

/**
 * Normalize phone number to international format (with 91 for India)
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  
  // If 10 digits, add India country code
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Check if cooldown period is active for this contact
 */
function isInCooldown(phone) {
  const reminders = getReminderHistory();
  const lastReminder = reminders[phone];
  
  if (!lastReminder) return false;
  
  const now = Date.now();
  const timeDiff = now - lastReminder.timestamp;
  const cooldownMs = 30 * 1000; // 30 seconds
  
  return timeDiff < cooldownMs;
}

/**
 * Get remaining cooldown time in seconds
 */
function getRemainingCooldown(phone) {
  const reminders = getReminderHistory();
  const lastReminder = reminders[phone];
  
  if (!lastReminder) return 0;
  
  const now = Date.now();
  const timeDiff = now - lastReminder.timestamp;
  const cooldownMs = 30 * 1000;
  
  if (timeDiff < cooldownMs) {
    return Math.ceil((cooldownMs - timeDiff) / 1000);
  }
  return 0;
}

/**
 * Get reminder history from localStorage
 */
function getReminderHistory() {
  try {
    const history = localStorage.getItem('whatsapp_reminders');
    return history ? JSON.parse(history) : {};
  } catch (e) {
    console.warn('Failed to parse reminder history:', e);
    return {};
  }
}

/**
 * Save reminder to history
 */
function saveReminderToHistory(phone, residentName) {
  try {
    const history = getReminderHistory();
    history[phone] = {
      timestamp: Date.now(),
      name: residentName,
      date: new Date().toISOString()
    };
    localStorage.setItem('whatsapp_reminders', JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save reminder history:', e);
  }
}

/**
 * Get last reminder info for display
 */
function getLastReminderInfo(phone) {
  const reminders = getReminderHistory();
  const reminder = reminders[phone];
  
  if (!reminder) return null;
  
  const lastDate = new Date(reminder.date);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  let timeStr = '';
  if (diffMins < 1) {
    timeStr = 'just now';
  } else if (diffMins < 60) {
    timeStr = `${diffMins} min ago`;
  } else if (diffHours < 24) {
    timeStr = `${diffHours}h ago`;
  } else {
    timeStr = `${diffDays}d ago`;
  }
  
  return `Last reminder sent ${timeStr}`;
}

/**
 * Handle WhatsApp reminder click
 */
async function handleWhatsAppReminder(residentData, roomData) {
  const phone = residentData.phone?.trim();
  
  // Validation 1: Check if phone is provided
  if (!phone) {
    showToast('Phone number not available', 'error');
    return;
  }
  
  // Validation 2: Validate phone format
  if (!isValidPhoneNumber(phone)) {
    showToast('Invalid phone number format', 'error');
    return;
  }
  
  // Validation 3: Check cooldown
  if (isInCooldown(phone)) {
    const remaining = getRemainingCooldown(phone);
    showToast(`Please wait ${remaining}s before sending another reminder`, 'warning');
    return;
  }
  
  // Show confirmation popup
  showWhatsAppConfirmation(residentData, roomData);
}

/**
 * Show confirmation popup before sending reminder
 */
function showWhatsAppConfirmation(residentData, roomData) {
  const name = residentData.name || 'User';
  
  // Create custom confirmation popup
  const overlay = document.createElement('div');
  overlay.className = 'whatsapp-confirm-overlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'whatsapp-confirm-dialog';
  
  const endDate = residentData.end_date instanceof Date 
    ? residentData.end_date 
    : residentData.end_date?.toDate?.() || new Date(residentData.end_date);
  
  const roomNo = roomData?.room_no || 'N/A';
  const endDateStr = formatDate(endDate);
  
  dialog.innerHTML = `
    <div class="whatsapp-confirm-content">
      <div class="whatsapp-confirm-icon">💬</div>
      <h3>Send Payment Reminder</h3>
      <p class="confirm-message">Send payment reminder to <strong>${name}</strong>?</p>
      
      <div class="reminder-details">
        <div class="detail-item">
          <span class="label">Room:</span>
          <span class="value">${roomNo}</span>
        </div>
        <div class="detail-item">
          <span class="label">Due Date:</span>
          <span class="value">${endDateStr}</span>
        </div>
      </div>
      
      <div class="whatsapp-confirm-actions">
        <button class="btn btn-ghost cancel-btn">Cancel</button>
        <button class="btn btn-primary send-btn">Send Reminder</button>
      </div>
    </div>
  `;
  
  overlay.appendChild(dialog);
  
  // Handle cancel
  dialog.querySelector('.cancel-btn').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Handle send
  dialog.querySelector('.send-btn').addEventListener('click', async () => {
    overlay.remove();
    await sendWhatsAppReminder(residentData, roomData);
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  document.body.appendChild(overlay);
}

/**
 * Send WhatsApp reminder
 */
async function sendWhatsAppReminder(residentData, roomData) {
  const phone = residentData.phone?.trim();
  const normalizedPhone = normalizePhoneNumber(phone);
  
  if (!normalizedPhone) {
    showToast('Invalid phone number', 'error');
    return;
  }
  
  try {
    // Build message
    const name = residentData.name || 'User';
    const roomNo = roomData?.room_no || 'N/A';
    const endDate = residentData.end_date instanceof Date 
      ? residentData.end_date 
      : residentData.end_date?.toDate?.() || new Date(residentData.end_date);
    const endDateStr = formatDate(endDate);
    
    const message = `Hello ${name},\n\nYour room payment is due soon.\n\nRoom No: ${roomNo}\nDue Date: ${endDateStr}\n\nPlease complete your payment on time.\n\nThank you.`;
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp URL
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
    
    // Save to reminder history BEFORE opening to ensure it's saved even if window opens
    saveReminderToHistory(phone, name);
    
    // Open WhatsApp in new tab/window
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, use intent to open WhatsApp app
      window.location.href = whatsappUrl;
    } else {
      // On desktop, open WhatsApp Web
      window.open(whatsappUrl, '_blank', 'width=600,height=800');
    }
    
    showToast('Opening WhatsApp...', 'success');
    
  } catch (err) {
    console.error('Error opening WhatsApp:', err);
    showToast('Failed to open WhatsApp', 'error');
  }
}

// ===== Init event listeners =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('back-btn').addEventListener('click', () => navigateTo('#/properties'));

  // Payment modal
  document.getElementById('payment-modal-close').addEventListener('click', closePaymentModal);
  document.getElementById('save-payment-btn').addEventListener('click', savePaymentUpdate);
  document.getElementById('payment-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closePaymentModal();
  });

  // Quick buttons
  document.getElementById('pay-1m').addEventListener('click', () => handlePaymentQuickBtn(1));
  document.getElementById('pay-3m').addEventListener('click', () => handlePaymentQuickBtn(3));
  document.getElementById('pay-6m').addEventListener('click', () => handlePaymentQuickBtn(6));
  document.getElementById('pay-custom').addEventListener('click', () => handlePaymentQuickBtn('custom'));

  // Add resident modal
  document.getElementById('add-resident-modal-close').addEventListener('click', closeAddResidentModal);
  document.getElementById('save-resident-btn').addEventListener('click', saveResident);
  document.getElementById('add-resident-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddResidentModal();
  });

  // Add Room modal
  document.getElementById('detail-add-room-btn').addEventListener('click', openAddRoomModal);
  document.getElementById('add-room-close').addEventListener('click', closeAddRoomModal);
  document.getElementById('save-room-btn').addEventListener('click', saveRoom);
  document.getElementById('add-room-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddRoomModal();
  });

  // Edit Field modal
  document.getElementById('edit-field-close').addEventListener('click', closeEditFieldModal);
  document.getElementById('edit-field-cancel').addEventListener('click', closeEditFieldModal);
  document.getElementById('edit-field-confirm').addEventListener('click', saveEditedField);
  document.getElementById('edit-field-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditFieldModal();
  });

  // Delete Resident modal
  document.getElementById('delete-resident-close').addEventListener('click', closeDeleteResidentModal);
  document.getElementById('delete-resident-cancel').addEventListener('click', closeDeleteResidentModal);
  document.getElementById('delete-resident-confirm').addEventListener('click', confirmDeleteResident);
  document.getElementById('delete-resident-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteResidentModal();
  });

  // Remark textarea character counter
  document.getElementById('edit-remark-input').addEventListener('input', updateRemarkCount);
});
