// User Authentication for Playlist Page
document.addEventListener('DOMContentLoaded', function() {
    console.log('User auth script for playlist loaded');
    
    let dropdownMenu = null;
    let profileToggle = null;
    
    // Wait for Firebase to be ready
    function waitForFirebase() {
        if (window.firebaseReady && window.firebaseAuth) {
            console.log('Firebase is ready, initializing auth...');
            initializeUserAuth();
        } else {
            console.log('Waiting for Firebase to be ready...');
            setTimeout(waitForFirebase, 100);
        }
    }
    
    function initializeUserAuth() {
        const auth = window.firebaseAuth;
        
        console.log('Starting user authentication setup for playlist');
        
        // Check auth state
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
            
            if (user) {
                setupUserProfile(user);
            } else {
                console.log('No user found, redirecting to login');
                setTimeout(() => {
                    window.location.href = "Login.html";
                }, 500);
            }
        });
    }

    function setupUserProfile(user) {
        console.log('Setting up user profile for:', user.email);
        
        // Show profile container
        const profileContainer = document.getElementById('profileContainer');
        if (profileContainer) {
            profileContainer.style.display = 'block';
            console.log('✅ Profile container shown');
        } else {
            console.error('❌ Profile container not found');
        }
        
        // Load and display user data
        loadAndDisplayUserData(user);
        
        // Setup dropdown functionality
        setupDropdown();
        
        // Setup event listeners
        setupEventListeners();
    }

    async function loadAndDisplayUserData(user) {
        const userFirstNameSpan = document.getElementById('userFirstName');
        if (!userFirstNameSpan) {
            console.error('❌ User name element not found');
            return;
        }
        
        try {
            let displayName = 'User'; // Default fallback
            
            // Try Firestore first for user data
            if (window.firebaseDb) {
                try {
                    const userDoc = await window.firebaseDb.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        console.log('User data from Firestore:', userData);
                        
                        if (userData.username) {
                            displayName = userData.username;
                        } else if (userData.displayName) {
                            displayName = userData.displayName;
                        }
                    } else {
                        console.log('No user data found in Firestore');
                    }
                } catch (firestoreError) {
                    console.error('Firestore error:', firestoreError);
                }
            }
            
            // Fallback to Firebase Auth displayName
            if (displayName === 'User' && user.displayName) {
                displayName = user.displayName;
            }
            
            // Final fallback to email username
            if (displayName === 'User' && user.email) {
                displayName = user.email.split('@')[0];
                // Capitalize first letter
                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            }
            
            // Update display
            userFirstNameSpan.textContent = displayName;
            console.log('✅ Username displayed:', displayName);
            
        } catch (error) {
            console.error('Error loading user data:', error);
            // Emergency fallbacks
            if (user.displayName) {
                userFirstNameSpan.textContent = user.displayName.split(' ')[0];
            } else if (user.email) {
                userFirstNameSpan.textContent = user.email.split('@')[0];
            } else {
                userFirstNameSpan.textContent = 'User';
            }
        }
    }

    function setupDropdown() {
        profileToggle = document.getElementById('profileToggle');
        dropdownMenu = document.getElementById('dropdownMenu');
        
        if (!profileToggle || !dropdownMenu) {
            console.error('❌ Dropdown elements not found');
            return;
        }
        
        // Toggle dropdown
        profileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            dropdownMenu.classList.toggle('show');
            console.log('Dropdown toggled');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (dropdownMenu && dropdownMenu.classList.contains('show') && 
                !dropdownMenu.contains(e.target) && 
                !profileToggle.contains(e.target)) {
                dropdownMenu.classList.remove('show');
                console.log('Dropdown closed');
            }
        });
    }

    function setupEventListeners() {
        const signOutBtn = document.getElementById('signOutBtn');
        const profileSettingsBtn = document.getElementById('profileSettings');
        const backToPlayerBtn = document.getElementById('backToPlayer');
        const auth = window.firebaseAuth;
        
        // Back to player button
        if (backToPlayerBtn) {
            backToPlayerBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Navigating back to player');
                window.location.href = "index.html";
            });
        }
        
        // Profile settings button
        if (profileSettingsBtn) {
            profileSettingsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Navigating to profile settings');
                window.location.href = "ProfileSettings.html";
            });
        }
        
        // Sign out button
        if (signOutBtn) {
            signOutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Signing out user...');
                auth.signOut().then(() => {
                    console.log('User signed out successfully');
                    window.location.href = "Login.html";
                }).catch((error) => {
                    console.error('Sign out error:', error);
                    alert('Error signing out: ' + error.message);
                });
            });
        }
    }
    
    // Start the initialization process
    waitForFirebase();
});