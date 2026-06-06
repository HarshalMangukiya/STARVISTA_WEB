// ===== Auth Module =====

let authMode = 'signin'; // 'signin', 'signup', 'forgot'

function initAuth() {
  const form = document.getElementById('auth-form');
  const toggleBtn = document.getElementById('auth-toggle-btn');
  const forgotBtn = document.getElementById('auth-forgot-btn');
  const passwordToggle = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('auth-password');
  const errorEl = document.getElementById('auth-error');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (authMode === 'forgot') {
        authMode = 'signin';
      } else if (authMode === 'signin') {
        authMode = 'signup';
      } else {
        authMode = 'signin';
      }
      updateAuthUI();
    });
  }

  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      authMode = 'forgot';
      updateAuthUI();
    });
  }

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      const eyeIcon = passwordToggle.querySelector('.eye-icon');
      const eyeOffIcon = passwordToggle.querySelector('.eye-off-icon');
      
      if (type === 'password') {
        if (eyeIcon) eyeIcon.style.display = 'block';
        if (eyeOffIcon) eyeOffIcon.style.display = 'none';
      } else {
        if (eyeIcon) eyeIcon.style.display = 'none';
        if (eyeOffIcon) eyeOffIcon.style.display = 'block';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';

      const email = document.getElementById('auth-email').value.trim();
      const submitBtn = document.getElementById('auth-submit');

      if (!email) {
        showAuthError('Please enter your email address');
        return;
      }

      if (authMode === 'forgot') {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending reset link...';

        try {
          await auth.sendPasswordResetEmail(email);
          showToast('Password reset link sent to your email!', 'success');
          authMode = 'signin';
          updateAuthUI();
        } catch (err) {
          let msg = err.message;
          if (err.code === 'auth/user-not-found') msg = 'No account found with this email';
          if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address';
          showAuthError(msg);
        } finally {
          submitBtn.disabled = false;
          if (authMode === 'forgot') {
            submitBtn.textContent = 'Send Reset Link';
          }
        }
        return;
      }

      const password = passwordInput.value;
      if (!password) {
        showAuthError('Please enter your password');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = authMode === 'signup' ? 'Creating account...' : 'Signing in...';

      try {
        if (authMode === 'signup') {
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
        submitBtn.textContent = authMode === 'signup' ? 'Sign Up' : 'Sign In';
      }
    });
  }
}

function updateAuthUI() {
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('auth-submit');
  const nameGroup = document.getElementById('auth-name-group');
  const passwordGroup = document.getElementById('auth-password-group');
  const toggleBtn = document.getElementById('auth-toggle-btn');
  const forgotBtn = document.getElementById('auth-forgot-btn');
  const passwordInput = document.getElementById('auth-password');

  if (!title || !subtitle || !submitBtn || !nameGroup || !passwordGroup || !toggleBtn || !forgotBtn || !passwordInput) return;

  // Reset password visibility toggling when switching screens
  passwordInput.setAttribute('type', 'password');
  const passwordToggle = document.getElementById('password-toggle');
  if (passwordToggle) {
    const eyeIcon = passwordToggle.querySelector('.eye-icon');
    const eyeOffIcon = passwordToggle.querySelector('.eye-off-icon');
    if (eyeIcon) eyeIcon.style.display = 'block';
    if (eyeOffIcon) eyeOffIcon.style.display = 'none';
  }

  if (authMode === 'signup') {
    title.textContent = 'Create Account';
    subtitle.textContent = 'Sign up to manage your hostels';
    submitBtn.textContent = 'Sign Up';
    nameGroup.style.display = 'block';
    passwordGroup.style.display = 'block';
    passwordInput.required = true;
    forgotBtn.style.display = 'none';
    toggleBtn.innerHTML = 'Already have an account? <strong>Sign In</strong>';
  } else if (authMode === 'forgot') {
    title.textContent = 'Reset Password';
    subtitle.textContent = 'Enter your email to receive a password reset link';
    submitBtn.textContent = 'Send Reset Link';
    nameGroup.style.display = 'none';
    passwordGroup.style.display = 'none';
    passwordInput.required = false;
    forgotBtn.style.display = 'none';
    toggleBtn.innerHTML = 'Back to <strong>Sign In</strong>';
  } else {
    // signin
    title.textContent = 'Welcome Back';
    subtitle.textContent = 'Sign in to manage your hostels';
    submitBtn.textContent = 'Sign In';
    nameGroup.style.display = 'none';
    passwordGroup.style.display = 'block';
    passwordInput.required = true;
    forgotBtn.style.display = 'block';
    toggleBtn.innerHTML = 'Don\'t have an account? <strong>Sign Up</strong>';
  }
}

function showAuthError(msg) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', initAuth);
