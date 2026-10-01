// Login Functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const googleLoginBtn = document.getElementById('googleLogin');
    const rememberCheckbox = document.getElementById('remember');

    // Check if user is already logged in
    const auth = window.firebaseAuth || firebase.auth();
    const db = window.firebaseDb || firebase.firestore();
    
    if (!auth) {
        console.error('Firebase Auth not available');
        return;
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is already logged in, redirect to main page
            window.location.href = "index.html";
        }
    });

    // Email/Password Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailInput.value;
            const password = passwordInput.value;
            const rememberMe = rememberCheckbox.checked;

            if (!email || !password) {
                showAlert('Please fill in all fields', 'error');
                return;
            }

            try {
                // Show loading state
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';

                // Set persistence based on remember me selection
                const persistence = rememberMe ? 
                    firebase.auth.Auth.Persistence.LOCAL : 
                    firebase.auth.Auth.Persistence.SESSION;
                
                await auth.setPersistence(persistence);
                
                // Sign in user
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Update last login in Firestore
                await updateLastLogin(user.uid);
                
                showAlert('Login successful! Redirecting...', 'success');
                
                // Redirect to main page after successful login
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000);
                
            } catch (error) {
                console.error('Login error:', error);
                let errorMessage = 'Login failed. Please try again.';
                
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled.';
                        break;
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Incorrect password.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed attempts. Please try again later.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your connection.';
                        break;
                }
                
                showAlert(errorMessage, 'error');
            } finally {
                // Re-enable login button
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Sign In';
            }
        });
    }

    // Google Login
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                // Show loading state
                googleLoginBtn.disabled = true;
                googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Connecting...';

                const provider = new firebase.auth.GoogleAuthProvider();
                
                // Add scopes if needed
                provider.addScope('profile');
                provider.addScope('email');
                
                const result = await auth.signInWithPopup(provider);
                const user = result.user;
                
                // Save/update user data in Firestore
                await saveOrUpdateUserData(user);
                
                showAlert('Google login successful! Redirecting...', 'success');
                
                // Redirect to main page
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000);
                
            } catch (error) {
                console.error('Google login error:', error);
                
                let errorMessage = 'Google login failed. Please try again.';
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'Login popup was closed. Please try again.';
                } else if (error.code === 'auth/popup-blocked') {
                    errorMessage = 'Popup was blocked. Please allow popups for this site.';
                } else if (error.code === 'auth/account-exists-with-different-credential') {
                    errorMessage = 'An account already exists with the same email address.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'Network error. Please check your connection.';
                }
                
                showAlert(errorMessage, 'error');
            } finally {
                // Re-enable Google login button
                googleLoginBtn.disabled = false;
                googleLoginBtn.innerHTML = '<i class="fab fa-google me-2"></i>Continue with Google';
            }
        });
    }

    // Update last login timestamp in Firestore
    async function updateLastLogin(userId) {
        try {
            await db.collection('users').doc(userId).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating last login:', error);
            // Don't throw error as login was successful
        }
    }

    // Save or update user data for Google login
    async function saveOrUpdateUserData(user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document
                await db.collection('users').doc(user.uid).set({
                    firstName: user.displayName?.split(' ')[0] || '',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    provider: 'google'
                });
            } else {
                // Update existing user document
                await db.collection('users').doc(user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    photoURL: user.photoURL,
                    displayName: user.displayName
                });
            }
        } catch (error) {
            console.error('Error saving user data:', error);
            // Don't throw error as login was successful
        }
    }

    // Show alert/notification
    function showAlert(message, type) {
        // Remove existing alerts
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create alert element
        const alert = document.createElement('div');
        alert.className = `custom-alert ${type === 'error' ? 'alert-error' : ''}`;
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(alert);

        // Remove alert after 3 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'slideUp 0.3s ease';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
});