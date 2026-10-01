// Profile Functionality - No Profile Pictures
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Profile script loaded');
    console.log('🏠 Profile page DOM fully loaded');
    
    // Start initialization immediately
    initializeProfile();
    
    function initializeProfile() {
        console.log('🚀 Starting application initialization...');
        
        const profileForm = document.getElementById('profileForm');
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const saveBtn = document.getElementById('saveBtn');
        const signOutBtn = document.getElementById('signOutBtn');
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        
        // Check if form elements exist
        if (!profileForm) {
            console.error('❌ Profile form not found');
            return;
        }
        
        console.log('✅ Profile form found, checking inputs...');
        
        if (!usernameInput || !emailInput || !saveBtn) {
            console.error('❌ Required form inputs not found');
            return;
        }
        
        console.log('✅ All form inputs found, initializing Firebase...');
        
        // Check Firebase readiness
        if (window.firebaseReady && window.auth) {
            console.log('✅ Firebase is ready, setting up auth listener');
            setupAuthListener();
        } else if (window.firebase && window.firebase.auth) {
            console.log('✅ Firebase available via firebase global, setting up auth listener');
            window.auth = window.firebase.auth();
            window.db = window.firebase.firestore();
            window.firebaseReady = true;
            setupAuthListener();
        } else {
            console.log('⏳ Firebase not ready yet, waiting...');
            // Wait for Firebase with timeout
            let attempts = 0;
            const maxAttempts = 50;
            const checkInterval = setInterval(() => {
                attempts++;
                if (window.firebaseReady && window.auth) {
                    clearInterval(checkInterval);
                    console.log('✅ Firebase ready after ' + attempts + ' attempts');
                    setupAuthListener();
                } else if (window.firebase && window.firebase.auth) {
                    clearInterval(checkInterval);
                    console.log('✅ Firebase available via firebase global after ' + attempts + ' attempts');
                    window.auth = window.firebase.auth();
                    window.db = window.firebase.firestore();
                    window.firebaseReady = true;
                    setupAuthListener();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('❌ Firebase failed to load after ' + maxAttempts + ' attempts');
                    showError('Failed to connect to authentication service. Please refresh the page.');
                }
            }, 100);
        }
        
        function setupAuthListener() {
            console.log('🔐 Setting up auth state listener');
            
            const auth = window.auth || firebase.auth();
            
            if (!auth) {
                console.error('❌ Auth service not available');
                return;
            }
            
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('✅ User authenticated:', user.email);
                    loadUserProfile(user);
                    setupFormHandlers(user);
                } else {
                    console.log('❌ No user authenticated, redirecting to login');
                    window.location.href = 'Login.html';
                }
            });
        }
        
        function loadUserProfile(user) {
            console.log('📖 Loading user profile for:', user.uid);
            
            // Populate form with current user data
            emailInput.value = user.email || '';
            
            // Load username/display name from user profile or Firestore
            const db = window.db || firebase.firestore();
            if (db) {
                db.collection('users').doc(user.uid).get()
                    .then((doc) => {
                        if (doc.exists) {
                            const userData = doc.data();
                            console.log('✅ User data loaded from Firestore:', userData);
                            
                            // Set username from Firestore data or user profile
                            if (userData.username) {
                                usernameInput.value = userData.username;
                            } else if (userData.displayName) {
                                usernameInput.value = userData.displayName;
                            } else if (user.displayName) {
                                usernameInput.value = user.displayName;
                            } else {
                                usernameInput.value = user.email?.split('@')[0] || '';
                            }
                        } else {
                            console.log('📝 No Firestore data found for user');
                            // Use displayName from auth or email username
                            usernameInput.value = user.displayName || user.email?.split('@')[0] || '';
                        }
                    })
                    .catch((error) => {
                        console.warn('⚠️ Could not load user data from Firestore:', error);
                        // Fallback to auth data
                        usernameInput.value = user.displayName || user.email?.split('@')[0] || '';
                    });
            } else {
                // Fallback to auth data
                usernameInput.value = user.displayName || user.email?.split('@')[0] || '';
            }
            
            console.log('✅ User profile loaded');
        }
        
        function setupFormHandlers(user) {
            console.log('⚙️ Setting up form handlers');
            
            // Form submission
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveProfile(user);
            });
            
            // Sign out button
            if (signOutBtn) {
                signOutBtn.addEventListener('click', function() {
                    const auth = window.auth || firebase.auth();
                    auth.signOut().then(() => {
                        window.location.href = 'Login.html';
                    }).catch((error) => {
                        console.error('Sign out error:', error);
                        showError('Failed to sign out: ' + error.message);
                    });
                });
            }
            
            // Delete account button
            if (deleteAccountBtn) {
                deleteAccountBtn.addEventListener('click', function() {
                    showDeleteAccountConfirmation(user);
                });
            }
            
            console.log('✅ Form handlers setup complete');
        }
        
        async function saveProfile(user) {
            console.log('💾 Saving profile...');
            
            const saveBtn = document.getElementById('saveBtn');
            const originalText = saveBtn.innerHTML;
            
            try {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
                
                const username = usernameInput.value.trim();
                
                if (!username) {
                    throw new Error('Username is required');
                }

                // Validate username
                if (username.length < 3) {
                    throw new Error('Username must be at least 3 characters long');
                }

                if (username.length > 20) {
                    throw new Error('Username must be less than 20 characters');
                }

                if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    throw new Error('Username can only contain letters, numbers, and underscores');
                }
                
                // Update user profile with username as displayName
                await user.updateProfile({
                    displayName: username
                });
                
                // Update user data in Firestore
                const db = window.db || firebase.firestore();
                if (db) {
                    await db.collection('users').doc(user.uid).set({
                        username: username.toLowerCase(),
                        displayName: username,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
                
                showSuccess('Profile updated successfully! Redirecting...');
                console.log('✅ Profile saved successfully');
                
                // Redirect to index.html after 1 second
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                
            } catch (error) {
                console.error('❌ Error saving profile:', error);
                showError('Failed to update profile: ' + error.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        }

        function showDeleteAccountConfirmation(user) {
            // Create confirmation modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            `;
            
            modal.innerHTML = `
                <div style="
                    background: var(--card-bg);
                    border: 1px solid var(--card-border);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 500px;
                    width: 90%;
                    color: var(--text-light);
                    backdrop-filter: blur(20px);
                ">
                    <h3 style="color: var(--danger-color); margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-triangle me-2"></i>Delete Account
                    </h3>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <p style="margin-bottom: 1rem; font-weight: 600;">Are you sure you want to delete your account?</p>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">
                            This action will permanently:
                        </p>
                        <ul style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1.5rem;">
                            <li>Delete your user account</li>
                            <li>Remove all your personal data</li>
                            <li>Delete your profile information</li>
                        </ul>
                        <p style="color: var(--danger-color); font-weight: 600; margin-top: 1rem;">
                            This action cannot be undone!
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; flex-wrap: wrap;">
                        <button id="cancelDelete" style="
                            background: rgba(255, 255, 255, 0.1);
                            border: 1px solid var(--card-border);
                            color: var(--text-light);
                            padding: 10px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">Cancel</button>
                        
                        <button id="confirmDelete" style="
                            background: var(--danger-color);
                            border: 1px solid var(--danger-color);
                            color: white;
                            padding: 10px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        ">Yes, Delete My Account</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            document.getElementById('cancelDelete').addEventListener('click', function() {
                document.body.removeChild(modal);
            });
            
            document.getElementById('confirmDelete').addEventListener('click', function() {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Deleting...';
                deleteUserAccount(user, modal);
            });
            
            // Close modal when clicking outside
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        }

        async function deleteUserAccount(user, modal) {
            try {
                console.log('🗑️ Starting account deletion process for:', user.uid);
                
                // Get Firebase services
                const auth = window.auth || firebase.auth();
                const db = window.db || firebase.firestore();
                
                // Step 1: Delete user data from Firestore
                if (db) {
                    try {
                        await db.collection('users').doc(user.uid).delete();
                        console.log('✅ User data deleted from Firestore');
                    } catch (error) {
                        console.warn('⚠️ Could not delete user data from Firestore:', error);
                        // Continue with account deletion even if Firestore fails
                    }
                }
                
                // Step 2: Delete the user account (main action)
                try {
                    await user.delete();
                    console.log('✅ User account deleted successfully');
                    
                    // Remove modal and show success message
                    if (modal && modal.parentNode) {
                        document.body.removeChild(modal);
                    }
                    
                    showSuccess('Account deleted successfully. Redirecting to login...');
                    
                    // Redirect to login page after delay
                    setTimeout(() => {
                        window.location.href = 'Login.html';
                    }, 2000);
                    
                } catch (deleteError) {
                    console.error('❌ Error deleting user account:', deleteError);
                    
                    // Re-enable the delete button
                    const confirmBtn = document.getElementById('confirmDelete');
                    if (confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.innerHTML = 'Yes, Delete My Account';
                    }
                    
                    let errorMessage = 'Failed to delete account. ';
                    
                    switch (deleteError.code) {
                        case 'auth/requires-recent-login':
                            errorMessage += 'For security, please sign out and sign in again before deleting your account.';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage += 'Network error. Please check your connection and try again.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage += 'Too many attempts. Please try again later.';
                            break;
                        default:
                            errorMessage += deleteError.message || 'Please try again later.';
                    }
                    
                    showError(errorMessage);
                }
                
            } catch (error) {
                console.error('❌ Error in account deletion process:', error);
                
                // Re-enable the delete button
                const confirmBtn = document.getElementById('confirmDelete');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = 'Yes, Delete My Account';
                }
                
                showError('Failed to delete account: ' + (error.message || 'Please try again later.'));
            }
        }
        
        function showSuccess(message) {
            showAlert(message, 'success');
        }
        
        function showError(message) {
            showAlert(message, 'error');
        }
        
        function showAlert(message, type) {
            // Remove existing alerts
            const existingAlert = document.querySelector('.custom-alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            // Create alert element
            const alert = document.createElement('div');
            alert.className = `custom-alert alert-${type}`;
            alert.innerHTML = `
                <div class="alert-content">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(alert);
            
            // Remove alert after 5 seconds for errors, 3 seconds for success
            const duration = type === 'error' ? 5000 : 3000;
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.style.animation = 'slideUp 0.3s ease';
                    setTimeout(() => {
                        if (alert.parentNode) {
                            alert.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
    }
});