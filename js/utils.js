// ===== Utility Functions =====

/**
 * Get payment status from end_date
 * @param {Date} endDate
 * @returns {'paid'|'upcoming'|'pending'}
 */
function getPaymentStatus(endDate) {
  if (!endDate) return 'pending';
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const end = endDate instanceof Date ? endDate : endDate.toDate();
  const endMidnight = new Date(end);
  endMidnight.setHours(0, 0, 0, 0);

  const diffMs = endMidnight.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'pending';
  if (diffDays <= 7) return 'upcoming';
  return 'paid';
}

/**
 * Format a date to dd-mm-yyyy
 */
function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : date.toDate();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parse a date string in dd-mm-yyyy, dd/mm/yyyy, or yyyy-mm-dd format to a Date object
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // If it's already a Date object
  if (dateStr instanceof Date) return dateStr;
  
  // If it is in yyyy-mm-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  
  // If it is in dd-mm-yyyy or dd/mm/yyyy format
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    // If first part is 4 digits, it might be yyyy-mm-dd or yyyy/mm/dd
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    } else {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateForInput(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add months to a date
 */
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Upload image to Cloudinary
 */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) throw new Error('Image upload failed');
  const data = await res.json();
  return data.secure_url;
}

/**
 * Create element helper
 */
function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') elem.className = v;
    else if (k === 'textContent') elem.textContent = v;
    else if (k === 'innerHTML') elem.innerHTML = v;
    else if (k.startsWith('on')) elem.addEventListener(k.slice(2).toLowerCase(), v);
    else elem.setAttribute(k, v);
  });
  children.forEach(c => {
    if (typeof c === 'string') elem.appendChild(document.createTextNode(c));
    else if (c) elem.appendChild(c);
  });
  return elem;
}
