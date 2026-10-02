// User Authentication and Profile Management
window.setPlaylistView = (show) => {
    if (document.body.classList.contains('app-secondary-view')) {
        window.setAppPage?.('player', { updateHash: false });
    }
    document.body.classList.toggle('show-playlists', show);
    const menuButton = document.getElementById('myPlaylistsBtn');
    if (menuButton) menuButton.innerHTML = show
        ? '<i class="fas fa-home"></i> Back to Player'
        : '<i class="fas fa-list-ul"></i> My Playlists';
    if (show) {
        history.replaceState(null, '', '#playlists');
        window.spotifyEnhancer?.refreshPlaylists?.();
    } else {
        window.returnToLibrary?.();
        history.replaceState(null, '', location.pathname);
    }
};

const initializePlaylistView = () => {
    if (location.hash === '#playlists') window.setPlaylistView(true);
};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlaylistView, { once: true });
} else {
    initializePlaylistView();
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('User auth script loaded');
    
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
        const db = window.firebaseDb;
        
        console.log('Starting user authentication setup');
        
        // Check auth state
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
            
            if (user) {
                setupUserProfile(user, db);
            } else {
                setupGuestProfile();
            }
        });
    }

    function setupGuestProfile() {
        const container = document.getElementById('profileContainer');
        if (!container) return;
        container.style.display = 'block';
        const name = document.getElementById('userFirstName');
        if (name) name.textContent = 'Guest';
        document.getElementById('profileSettings')?.style.setProperty('display', 'none');
        document.getElementById('signOutBtn')?.style.setProperty('display', 'none');
        document.getElementById('signInBtn')?.style.removeProperty('display');
        document.getElementById('registerBtn')?.style.removeProperty('display');
        setupDropdown();
        setupEventListeners(null);
    }

    function setupUserProfile(user, db) {
        console.log('Setting up user profile for:', user.email);
        
        // Show profile container
        const profileContainer = document.getElementById('profileContainer');
        if (profileContainer) {
            profileContainer.style.display = 'block';
            console.log('✅ Profile container shown');
        } else {
            console.error('❌ Profile container not found');
        }
        document.getElementById('profileSettings')?.style.removeProperty('display');
        document.getElementById('signOutBtn')?.style.removeProperty('display');
        document.getElementById('signInBtn')?.style.setProperty('display', 'none');
        document.getElementById('registerBtn')?.style.setProperty('display', 'none');
        
        // Load and display user data
        loadAndDisplayUserData(user, db);
        
        // Setup dropdown functionality
        setupDropdown();
        
        // Setup event listeners
        setupEventListeners(user);
    }

    async function loadAndDisplayUserData(user, db) {
        const userFirstNameSpan = document.getElementById('userFirstName');
        if (!userFirstNameSpan) {
            console.error('❌ User name element not found');
            return;
        }
        
        try {
            let displayName = 'User'; // Default fallback
            
            // Try Firestore first for user data
            if (db) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
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
        if (profileToggle.dataset.dropdownInitialized === 'true') return;
        profileToggle.dataset.dropdownInitialized = 'true';
        profileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            dropdownMenu.classList.toggle('show');
            console.log('Dropdown toggled');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (dropdownMenu.classList.contains('show') && 
                !dropdownMenu.contains(e.target) && 
                !profileToggle.contains(e.target)) {
                dropdownMenu.classList.remove('show');
                console.log('Dropdown closed');
            }
        });
    }

    function setupEventListeners(user) {
        const signOutBtn = document.getElementById('signOutBtn');
        const myPlaylistsBtn = document.getElementById('myPlaylistsBtn');
        const auth = window.firebaseAuth;
        
        // My Playlists button
        if (myPlaylistsBtn && myPlaylistsBtn.dataset.authBound !== 'true') {
            myPlaylistsBtn.dataset.authBound = 'true';
            myPlaylistsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const isPlaylistView = document.body.classList.contains('show-playlists');
                const showPlaylists = !isPlaylistView;
                if (window.setPlaylistView) window.setPlaylistView(showPlaylists);
                else {
                    document.body.classList.toggle('show-playlists', showPlaylists);
                    this.innerHTML = showPlaylists
                        ? '<i class="fas fa-home"></i> Back to Player'
                        : '<i class="fas fa-list-ul"></i> My Playlists';
                    if (showPlaylists) window.spotifyEnhancer?.refreshPlaylists?.();
                    else window.returnToLibrary?.();
                    history.replaceState(null, '', showPlaylists ? '#playlists' : location.pathname);
                }
                document.getElementById('dropdownMenu')?.classList.remove('show');
            });
        }
        
        // Sign out button
        if (signOutBtn && signOutBtn.dataset.authBound !== 'true') {
            signOutBtn.dataset.authBound = 'true';
            signOutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Signing out user...');
                auth.signOut().then(() => {
                    console.log('User signed out successfully');
                }).catch((error) => {
                    console.error('Sign out error:', error);
                    alert('Error signing out: ' + error.message);
                });
            });
        }

        const signInBtn = document.getElementById('signInBtn');
        if (signInBtn && signInBtn.dataset.authBound !== 'true') {
            signInBtn.dataset.authBound = 'true';
            signInBtn.addEventListener('click', () => { window.location.href = 'Login.html'; });
        }
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn && registerBtn.dataset.authBound !== 'true') {
            registerBtn.dataset.authBound = 'true';
            registerBtn.addEventListener('click', () => { window.location.href = 'Register.html'; });
        }
    }
    
    // Start the initialization process
    waitForFirebase();
});
