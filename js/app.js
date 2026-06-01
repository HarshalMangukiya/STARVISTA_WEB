// ===== Firebase Config & Router =====

// !! PLACEHOLDER — Replace with your Firebase project config !!
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAGYgR_99dU_Ges10lZOfncYrSV-uRrAgM",
  authDomain: "starvista-b0d10.firebaseapp.com",
  projectId: "starvista-b0d10",
  storageBucket: "starvista-b0d10.firebasestorage.app",
  messagingSenderId: "52555511702",
  appId: "1:52555511702:web:f79f204d7fdd27b9f9cfb7",
  measurementId: "G-08QZTZF66B"
};

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'doe8ybkzu';
const CLOUDINARY_UPLOAD_PRESET = 'STARVISTA';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Initialize Firebase
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
db.settings({
  experimentalForceLongPolling: true
});

// ===== Router =====
const routes = {
  login: 'login-screen',
  properties: 'properties-screen',
  property: 'property-screen'
};

function navigateTo(hash) {
  window.location.hash = hash;
}

function getRoute() {
  const hash = window.location.hash.slice(2) || 'login'; // remove #/
  const parts = hash.split('/');
  return { name: parts[0], params: parts.slice(1) };
}

function handleRoute() {
  const route = getRoute();

  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  // Auth guard
  const user = auth.currentUser;
  if (!user && route.name !== 'login') {
    navigateTo('#/login');
    return;
  }
  if (user && route.name === 'login') {
    navigateTo('#/properties');
    return;
  }

  switch (route.name) {
    case 'login':
      document.getElementById(routes.login).classList.add('active');
      break;
    case 'properties':
      document.getElementById(routes.properties).classList.add('active');
      loadProperties();
      break;
    case 'property':
      document.getElementById(routes.property).classList.add('active');
      if (route.params[0]) loadPropertyDetail(route.params[0]);
      break;
    default:
      navigateTo(user ? '#/properties' : '#/login');
  }
}

// Listen for route changes
window.addEventListener('hashchange', handleRoute);

// Auth state listener
auth.onAuthStateChanged((user) => {
  handleRoute();
});

// Initial route
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) {
    window.location.hash = '#/login';
  }
  // handleRoute will be called by onAuthStateChanged
});
