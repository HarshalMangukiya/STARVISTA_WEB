// ===== Auth Module =====

let isSignUp = false;

function initAuth() {
  const form = document.getElementById('auth-form');
  const toggleBtn = document.getElementById('auth-toggle-btn');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('auth-submit');
  const nameGroup = document.getElementById('auth-name-group');
  const errorEl = document.getElementById('auth-error');

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    updateAuthUI();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
      showAuthError('Please fill in all fields');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';

    try {
      if (isSignUp) {
        const name = document.getElementById('auth-name').value.trim();
        if (!name) {
          showAuthError('Please enter your name');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign Up';
          return;
        }
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        // Store user data in Firestore
        await db.collection('users').doc(cred.user.uid).set({
          email: email,
          name: name,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
      // onAuthStateChanged will handle navigation
    } catch (err) {
      let msg = err.message;
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email';
      if (err.code === 'auth/wrong-password') msg = 'Incorrect password';
      if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists';
      if (err.code === 'auth/weak-password') msg = 'Password should be at least 6 characters';
      showAuthError(msg);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
  });
}

function updateAuthUI() {
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('auth-submit');
  const nameGroup = document.getElementById('auth-name-group');
  const toggleBtn = document.getElementById('auth-toggle-btn');

  if (isSignUp) {
    title.textContent = 'Create Account';
    subtitle.textContent = 'Sign up to manage your hostels';
    submitBtn.textContent = 'Sign Up';
    nameGroup.style.display = 'block';
    toggleBtn.innerHTML = 'Already have an account? <strong>Sign In</strong>';
  } else {
    title.textContent = 'Welcome Back';
    subtitle.textContent = 'Sign in to manage your hostels';
    submitBtn.textContent = 'Sign In';
    nameGroup.style.display = 'none';
    toggleBtn.innerHTML = 'Don\'t have an account? <strong>Sign Up</strong>';
  }
}

function showAuthError(msg) {
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}

// Init on load
document.addEventListener('DOMContentLoaded', initAuth);
