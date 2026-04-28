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
          textContent: resIdx === 0 ? `Room ${room.data.room_no}` : '',
          style: resIdx === 0 ? 'font-weight:600;color:var(--accent-hover);' : ''
        }),
        // Name
        el('td', { className: 'name-cell', textContent: resident.data.name }),
        // Contact
        el('td', {}, [
          el('div', { className: 'contact-phone' }, [
            el('span', { textContent: '📞 ', style: 'font-size: 10px; margin-right: 4px;' }),
            el('span', { textContent: resident.data.phone || '—' })
          ])
        ]),
        // Start Date
        el('td', {}, [
          el('div', { className: 'date-range' }, [
            el('span', { className: 'dot dot-blue' }),
            el('span', { textContent: ' ' + formatDate(resident.data.start_date) })
          ])
        ]),
        // End Date
        el('td', {}, [
          el('div', { className: 'date-range', style: 'color:var(--text-muted);' }, [
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
        el('td', { textContent: resident.data.remarks || '—', style: 'color:var(--text-secondary);max-width:150px;overflow:hidden;text-overflow:ellipsis;' })
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
        el('td', { colspan: '6' }, [
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

    showToast('Payment updated!');
    closePaymentModal();
    loadPropertyDetail(currentPropertyId);
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
    await db.collection('properties').doc(currentPropertyId)
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

    showToast('Resident added!');
    closeAddResidentModal();
    loadPropertyDetail(currentPropertyId);
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
    await db.collection('properties').doc(currentPropertyId)
      .collection('rooms').add({
        room_no: roomNo,
        capacity: cap,
        monthly_rent: rent
      });
      
    // Update the total_rooms count
    await db.collection('properties').doc(currentPropertyId).update({
      total_rooms: firebase.firestore.FieldValue.increment(1)
    });

    showToast('Room added successfully!');
    closeAddRoomModal();
    loadPropertyDetail(currentPropertyId);
  } catch (err) {
    console.error('Error adding room:', err);
    showToast('Failed to add room', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Room';
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
});
