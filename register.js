// Register Functionality - No Profile Pictures
document.addEventListener('DOMContentLoaded', function() {
    console.log('Register script loaded');
    
    // Wait for Firebase to be fully initialized
    function initializeRegister() {
        // Get auth with multiple fallback options
        const auth = window.auth || window.firebaseAuth || window.firebaseServices?.auth || firebase?.auth();
        
        if (!auth) {
            console.log('Auth not available yet, retrying in 500ms...');
            setTimeout(initializeRegister, 500);
            return;
        }
        
        console.log('Auth service available, setting up registration form');
        
        const registerForm = document.getElementById('registerForm');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const submitBtn = document.getElementById('submit');
        const googleRegisterBtn = document.getElementById('googleRegister');
        const successAlert = document.getElementById('successAlert');

        // Check if user is already logged in
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is already logged in, redirect to main page
                window.location.href = "index.html";
            }
        });

        // Username validation
        if (usernameInput) {
            usernameInput.addEventListener('input', function() {
                const username = usernameInput.value;
                // Basic username validation
                if (username.length < 3) {
                    usernameInput.classList.add('is-invalid');
                    usernameInput.classList.remove('is-valid');
                } else if (username.length > 20) {
                    usernameInput.classList.add('is-invalid');
                    usernameInput.classList.remove('is-valid');
                } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    usernameInput.classList.add('is-invalid');
                    usernameInput.classList.remove('is-valid');
                } else {
                    usernameInput.classList.remove('is-invalid');
                    usernameInput.classList.add('is-valid');
                }
            });
        }

        // Password validation
        const requirements = {
            uppercase: /[A-Z]/,
            lowercase: /[a-z]/,
            number: /[0-9]/,
            special: /[^A-Za-z0-9]/,
            length: /.{8,}/
        };

        function updateRequirement(id, valid, text) {
            const element = document.getElementById(id);
            if (element) {
                if (valid) {
                    element.classList.remove("text-danger");
                    element.classList.add("text-success");
                    element.innerHTML = "✅ " + text;
                } else {
                    element.classList.remove("text-success");
                    element.classList.add("text-danger");
                    element.innerHTML = "❌ " + text;
                }
            }
        }

        if (passwordInput) {
            passwordInput.addEventListener("input", () => {
                const value = passwordInput.value;
                updateRequirement("uppercase", requirements.uppercase.test(value), "Uppercase letter");
                updateRequirement("lowercase", requirements.lowercase.test(value), "Lowercase letter");
                updateRequirement("number", requirements.number.test(value), "Number");
                updateRequirement("special", requirements.special.test(value), "Special character");
                updateRequirement("length", requirements.length.test(value), "At least 8 characters");
            });
        }

        // Form submission
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value.trim();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                // Validation
                if (!username || !email || !password || !confirmPassword) {
                    showAlert('Please fill in all fields', 'error');
                    return;
                }

                // Username validation
                if (username.length < 3) {
                    showAlert('Username must be at least 3 characters long', 'error');
                    return;
                }

                if (username.length > 20) {
                    showAlert('Username must be less than 20 characters', 'error');
                    return;
                }

                if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    showAlert('Username can only contain letters, numbers, and underscores', 'error');
                    return;
                }

                if (password !== confirmPassword) {
                    showAlert('Passwords do not match', 'error');
                    return;
                }

                // Check password strength
                const isStrongPassword = Object.values(requirements).every(regex => regex.test(password));
                if (!isStrongPassword) {
                    showAlert('Please meet all password requirements', 'error');
                    return;
                }

                try {
                    // Disable submit button
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';

                    // Get db with multiple fallback options
                    const db = window.db || window.firebaseDb || window.firebaseServices?.db || firebase?.firestore();
                    
                    if (!db) {
                        throw new Error('Database not available');
                    }

                    // Check if username already exists in Firestore
                    const usernameQuery = await db.collection('users')
                        .where('username', '==', username.toLowerCase())
                        .get();

                    if (!usernameQuery.empty) {
                        showAlert('Username already exists. Please choose a different one.', 'error');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
                        return;
                    }

                    // Create user with email and password
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    const user = userCredential.user;

                    // Update user profile with username
                    await user.updateProfile({
                        displayName: username
                    });

                    // Save user data to Firestore
                    await saveUserData(user.uid, {
                        username: username.toLowerCase(),
                        displayName: username,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }, db);

                    // Show success message
                    showAlert('Account created successfully! Redirecting...', 'success');

                    // Redirect to main page after delay
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 2000);

                } catch (error) {
                    console.error('Registration error:', error);
                    let errorMessage = 'Registration failed. Please try again.';
                    
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'This email is already registered.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Invalid email address.';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Password is too weak.';
                            break;
                        case 'auth/operation-not-allowed':
                            errorMessage = 'Email/password accounts are not enabled.';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Network error. Please check your connection.';
                            break;
                        default:
                            errorMessage = error.message || 'Registration failed. Please try again.';
                    }
                    
                    showAlert(errorMessage, 'error');
                } finally {
                    // Re-enable submit button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
                }
            });
        }

        // Google Registration
        if (googleRegisterBtn) {
            googleRegisterBtn.addEventListener('click', async () => {
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    
                    // Add scopes
                    provider.addScope('profile');
                    provider.addScope('email');
                    
                    const result = await auth.signInWithPopup(provider);
                    const user = result.user;
                    
                    // Get db with multiple fallback options
                    const db = window.db || window.firebaseDb || window.firebaseServices?.db || firebase?.firestore();
                    
                    // Generate username from email (before @ symbol)
                    const usernameFromEmail = user.email.split('@')[0];
                    
                    // Save/update user data in Firestore
                    await saveUserData(user.uid, {
                        username: usernameFromEmail.toLowerCase(),
                        email: user.email,
                        displayName: user.displayName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        provider: 'google'
                    }, db);

                    showAlert('Google registration successful! Redirecting...', 'success');
                    
                    // Redirect to main page
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1000);
                    
                } catch (error) {
                    console.error('Google registration error:', error);
                    
                    let errorMessage = 'Google registration failed. Please try again.';
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage = 'Registration popup was closed. Please try again.';
                    } else if (error.code === 'auth/popup-blocked') {
                        errorMessage = 'Popup was blocked. Please allow popups for this site.';
                    } else if (error.code === 'auth/account-exists-with-different-credential') {
                        errorMessage = 'An account already exists with the same email address.';
                    } else if (error.code === 'auth/network-request-failed') {
                        errorMessage = 'Network error. Please check your connection.';
                    }
                    
                    showAlert(errorMessage, 'error');
                }
            });
        }

        // Save user data to Firestore
        async function saveUserData(userId, userData, db) {
            try {
                await db.collection('users').doc(userId).set(userData, { merge: true });
            } catch (error) {
                console.error('Error saving user data:', error);
                // Don't throw error here as auth registration was successful
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
    }

    // Start initialization with a small delay
    setTimeout(initializeRegister, 100);
});