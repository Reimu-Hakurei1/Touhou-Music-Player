class PlaylistManagerFixed {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.playlists = [];
        this.currentPlaylist = null;
        this.currentPlaylistTracks = [];
        this.initialized = false;
        
        this.init();
    }

    async init() {
        await this.waitForFirebase();
        this.setupAuthListener();
        this.setupEventListeners();
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseReady && window.firebaseAuth) {
                    this.db = window.firebaseDb;
                    console.log('PlaylistManager: Firebase services available', {
                        auth: !!window.firebaseAuth,
                        db: !!window.firebaseDb
                    });
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    setupAuthListener() {
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged((user) => {
                if (user) {
                    this.currentUser = user;
                    this.initialized = true;
                    console.log('PlaylistManager: User authenticated', user.email);
                    this.loadPlaylists();
                } else {
                    this.currentUser = null;
                    this.initialized = true;
                    console.log('PlaylistManager: User signed out');
                    setTimeout(() => {
                        window.location.href = "Login.html";
                    }, 500);
                }
            });

            // Also check current auth state immediately (in case auth state already changed)
            const currentUser = window.firebaseAuth.currentUser;
            if (currentUser && !this.currentUser) {
                console.log('PlaylistManager: User already authenticated on init', currentUser.email);
                this.currentUser = currentUser;
                this.initialized = true;
                this.loadPlaylists();
            }
        }
    }

    setupEventListeners() {
        // Create playlist button
        const createBtn = document.getElementById('createPlaylistBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createPlaylist());
        }

        // Enter key for playlist creation
        const playlistInput = document.getElementById('newPlaylistName');
        if (playlistInput) {
            playlistInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.createPlaylist();
                }
            });
        }

        // Back to playlists button
        const backToPlaylistsBtn = document.getElementById('backToPlaylists');
        if (backToPlaylistsBtn) {
            backToPlaylistsBtn.addEventListener('click', () => {
                this.showPlaylistList();
            });
        }

        // Delete playlist button in modal
        const deleteBtn = document.getElementById('deletePlaylistBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentPlaylist());
        }

        // Profile settings button
        const profileSettingsBtn = document.getElementById('profileSettings');
        if (profileSettingsBtn) {
            profileSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = "ProfileSettings.html";
            });
        }

        // Sign out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignOut();
            });
        }

        // Back to player button
        const backToPlayerBtn = document.getElementById('backToPlayer');
        if (backToPlayerBtn) {
            backToPlayerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = "index.html";
            });
        }

        // Create playlist modal button
        const createModalBtn = document.getElementById('createPlaylistModalBtn');
        if (createModalBtn) {
            createModalBtn.addEventListener('click', () => this.createPlaylistFromModal());
        }

        // Modal input enter key
        const modalInput = document.getElementById('newPlaylistNameModal');
        if (modalInput) {
            modalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.createPlaylistFromModal();
                }
            });
        }
    }

    async createPlaylist() {
        const nameInput = document.getElementById('newPlaylistName');
        const name = nameInput.value.trim();

        if (!name) {
            alert('Please enter a playlist name');
            return;
        }

        if (name.length > 50) {
            alert('Playlist name must be 50 characters or less');
            return;
        }

        if (!this.isUserAuthenticated()) {
            alert('Please log in to create playlists');
            return;
        }

        if (this.playlists.some(playlist => playlist.name.toLowerCase() === name.toLowerCase())) {
            alert('A playlist with this name already exists');
            return;
        }

        try {
            const playlist = {
                name: name,
                tracks: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const docRef = await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .add(playlist);

            console.log('Playlist created with ID:', docRef.id);
            
            nameInput.value = '';
            await this.loadPlaylists();
            this.showNotification('Playlist created successfully!', 'success');

        } catch (error) {
            console.error('Error creating playlist:', error);
            this.showNotification('Error creating playlist: ' + error.message, 'error');
        }
    }

    async createPlaylistFromModal() {
        const modalInput = document.getElementById('newPlaylistNameModal');
        const name = modalInput.value.trim();

        if (!name) {
            alert('Please enter a playlist name');
            return;
        }

        if (name.length > 50) {
            alert('Playlist name must be 50 characters or less');
            return;
        }

        if (!this.isUserAuthenticated()) {
            alert('Please log in to create playlists');
            return;
        }

        if (this.playlists.some(playlist => playlist.name.toLowerCase() === name.toLowerCase())) {
            alert('A playlist with this name already exists');
            return;
        }

        try {
            const playlist = {
                name: name,
                tracks: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const docRef = await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .add(playlist);

            console.log('Playlist created with ID:', docRef.id);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createPlaylistModal'));
            if (modal) {
                modal.hide();
            }
            
            modalInput.value = '';
            await this.loadPlaylists();
            this.showNotification('Playlist created successfully!', 'success');

        } catch (error) {
            console.error('Error creating playlist:', error);
            this.showNotification('Error creating playlist: ' + error.message, 'error');
        }
    }

    async loadPlaylists() {
        if (!this.isUserAuthenticated()) return;

        try {
            const snapshot = await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .orderBy('updatedAt', 'desc')
                .get();

            this.playlists = [];
            snapshot.forEach(doc => {
                this.playlists.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('📋 Raw playlists loaded:', this.playlists.length);

            // Ensure all playlists have their tracks loaded
            await this.ensurePlaylistsHaveTracks();

            console.log('📋 Playlists with tracks:', this.playlists.length);
            this.playlists.forEach(p => {
                console.log(`  - ${p.name}: ${p.tracks?.length || 0} tracks`);
            });

            this.renderPlaylists();
            console.log('Loaded playlists with tracks:', this.playlists.length);

            // Notify Spotify enhancer that playlists have been updated
            window.dispatchEvent(new Event('playlistsUpdated'));
            console.log('📢 Dispatched playlistsUpdated event');

        } catch (error) {
            console.error('Error loading playlists:', error);
            this.showNotification('Error loading playlists: ' + error.message, 'error');
        }
    }

    async ensurePlaylistsHaveTracks() {
        if (!this.playlists || this.playlists.length === 0) return;
        
        for (let playlist of this.playlists) {
            if (!playlist.tracks || playlist.tracks.length === 0) {
                console.log(`🔄 Loading tracks for playlist: ${playlist.name}`);
                playlist.tracks = await this.loadPlaylistTracksForSpotify(playlist.id);
            }
        }
    }

    async loadPlaylistTracksForSpotify(playlistId) {
        if (!this.isUserAuthenticated()) return [];

        try {
            const playlistDoc = await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .doc(playlistId)
                .get();

            if (playlistDoc.exists) {
                const playlist = playlistDoc.data();
                console.log(`📊 Loaded ${playlist.tracks?.length || 0} tracks for playlist: ${playlist.name}`);
                return playlist.tracks || [];
            }
            return [];

        } catch (error) {
            console.error('Error loading playlist tracks:', error);
            return [];
        }
    }

    renderPlaylists() {
        const container = document.getElementById('playlistsContainer');
        const noPlaylists = document.getElementById('noPlaylists');

        if (!container) return;

        if (this.playlists.length === 0) {
            container.innerHTML = '';
            if (noPlaylists) noPlaylists.style.display = 'block';
            return;
        }

        if (noPlaylists) noPlaylists.style.display = 'none';

        container.innerHTML = this.playlists.map(playlist => `
            <div class="col-md-4 mb-4">
                <div class="card playlist-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${this.escapeHtml(playlist.name)}</h5>
                        <p class="card-text text-muted">
                            ${playlist.tracks ? playlist.tracks.length : 0} track${playlist.tracks && playlist.tracks.length !== 1 ? 's' : ''}
                        </p>
                        <p class="card-text small text-muted">
                            Updated: ${this.formatDate(playlist.updatedAt?.toDate())}
                        </p>
                    </div>
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-outline-primary btn-sm view-playlist" 
                                data-playlist-id="${playlist.id}">
                            <i class="fas fa-eye me-1"></i>View
                        </button>
                        <button class="btn btn-outline-success btn-sm ms-2 play-playlist" 
                                data-playlist-id="${playlist.id}"
                                data-playlist-name="${this.escapeHtml(playlist.name)}">
                            <i class="fas fa-play me-1"></i>Play
                        </button>
                        <button class="btn btn-outline-warning btn-sm ms-2 rename-playlist" 
                                data-playlist-id="${playlist.id}"
                                data-playlist-name="${this.escapeHtml(playlist.name)}">
                            <i class="fas fa-edit me-1"></i>Rename
                        </button>
                        <button class="btn btn-outline-info btn-sm ms-2 download-playlist" 
                                data-playlist-id="${playlist.id}">
                            <i class="fas fa-download me-1"></i>Download
                        </button>
                        <button class="btn btn-outline-danger btn-sm ms-2 delete-playlist" 
                                data-playlist-id="${playlist.id}">
                            <i class="fas fa-trash me-1"></i>Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.view-playlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playlistId = e.target.closest('.view-playlist').dataset.playlistId;
                this.viewPlaylist(playlistId);
            });
        });

        container.querySelectorAll('.play-playlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playlistId = e.target.closest('.play-playlist').dataset.playlistId;
                const playlistName = e.target.closest('.play-playlist').dataset.playlistName;
                this.playPlaylist(playlistId, playlistName);
            });
        });

        container.querySelectorAll('.rename-playlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playlistId = e.target.closest('.rename-playlist').dataset.playlistId;
                const currentName = e.target.closest('.rename-playlist').dataset.playlistName;
                this.renamePlaylist(playlistId, currentName);
            });
        });

        container.querySelectorAll('.download-playlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playlistId = e.target.closest('.download-playlist').dataset.playlistId;
                this.downloadPlaylist(playlistId);
            });
        });

        container.querySelectorAll('.delete-playlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playlistId = e.target.closest('.delete-playlist').dataset.playlistId;
                this.deletePlaylist(playlistId);
            });
        });
    }

    playPlaylist(playlistId, playlistName) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
            this.showNotification('No tracks in this playlist', 'error');
            return;
        }

        // Set the current playlist tracks for the player
        window.currentPlaylistTracks = playlist.tracks;
        
        // Load and play the first track
        if (window.loadTrack && window.playTrack) {
            window.currentIndex = 0;
            window.loadTrack(0);
            window.playTrack();
            this.showNotification(`Now playing: ${playlistName}`, 'success');
            
            // Navigate to main player
            window.location.href = "index.html";
        } else {
            this.showNotification('Error: Player not ready', 'error');
        }
    }

    async showPlaylistTracks(playlistId, playlistName) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return;

        this.currentPlaylist = playlist;
        this.currentPlaylistTracks = playlist.tracks;

        // Update global variable for player
        window.currentPlaylistTracks = playlist.tracks;

        // Show/hide sections
        document.getElementById('playlistsContainer').style.display = 'none';
        document.getElementById('createPlaylistSection').style.display = 'none';
        document.getElementById('currentPlaylistSection').style.display = 'block';
        document.getElementById('currentPlaylistTitle').textContent = playlistName;

        this.renderPlaylistTracksPage(playlist.tracks);
    }

    showPlaylistList() {
        document.getElementById('playlistsContainer').style.display = 'flex';
        document.getElementById('createPlaylistSection').style.display = 'block';
        document.getElementById('currentPlaylistSection').style.display = 'none';
        this.currentPlaylist = null;
        this.currentPlaylistTracks = [];
        window.currentPlaylistTracks = [];
    }

    renderPlaylistTracksPage(tracks) {
        const container = document.getElementById('currentPlaylistTracks');
        
        if (!tracks || tracks.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-music fa-3x text-muted mb-3"></i>
                        <h4>No Tracks in Playlist</h4>
                        <p class="text-muted">Add some tracks to this playlist to start listening!</p>
                        <button class="btn btn-primary mt-3" onclick="window.location.href='index.html'">
                            <i class="fas fa-arrow-left me-2"></i>Go to Player
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = tracks.map((track, index) => `
            <div class="col-md-6 mb-3">
                <div class="track card h-100 d-flex flex-row align-items-center p-2 position-relative" 
                     data-index="${index}" data-file="${track.file}">
                    <img src="${track.cover}" class="track-cover me-3" alt="cover">
                    <div class="flex-grow-1">
                        <div class="track-title fw-bold">${track.title}</div>
                        <div class="track-artist">${track.artist}</div>
                    </div>
                    <div class="track-duration text-muted small me-3">${this.formatTime(track.duration) || '--:--'}</div>
                    <div class="track-actions">
                        <button class="track-play-btn" title="Play ${track.title}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="track-remove-btn ms-2" title="Remove from playlist">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.track-play-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrackFromPlaylist(index);
            });
        });

        container.querySelectorAll('.track-remove-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTrackFromPlaylistPage(index);
            });
        });

        container.querySelectorAll('.track').forEach((trackEl, index) => {
            trackEl.addEventListener('click', () => {
                this.playTrackFromPlaylist(index);
            });
        });
    }

    playTrackFromPlaylist(index) {
        if (!this.currentPlaylistTracks || this.currentPlaylistTracks.length === 0) return;
        
        const track = this.currentPlaylistTracks[index];
        if (track && window.loadTrack && window.playTrack) {
            window.currentIndex = index;
            window.loadTrack(index);
            window.playTrack();
            
            this.showNotification(`Now playing: ${track.title}`, 'success');
        } else {
            this.showNotification('Error playing track', 'error');
        }
    }

    async removeTrackFromPlaylistPage(index) {
        if (!this.currentPlaylist) return;

        try {
            this.currentPlaylist.tracks.splice(index, 1);
            this.currentPlaylist.updatedAt = new Date();

            await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .doc(this.currentPlaylist.id)
                .update({
                    tracks: this.currentPlaylist.tracks,
                    updatedAt: this.currentPlaylist.updatedAt
                });

            this.currentPlaylistTracks = this.currentPlaylist.tracks;
            window.currentPlaylistTracks = this.currentPlaylist.tracks;
            
            this.renderPlaylistTracksPage(this.currentPlaylistTracks);
            await this.loadPlaylists();

            this.showNotification('Track removed from playlist', 'success');

        } catch (error) {
            console.error('Error removing track:', error);
            this.showNotification('Error removing track: ' + error.message, 'error');
        }
    }

    async renamePlaylist(playlistId, currentName) {
        const newName = prompt('Enter new playlist name:', currentName);
        
        if (!newName || newName.trim() === '') {
            return;
        }

        const trimmedName = newName.trim();
        
        if (trimmedName === currentName) {
            return; // No change
        }

        if (trimmedName.length > 50) {
            alert('Playlist name must be 50 characters or less');
            return;
        }

        // Check if playlist name already exists
        if (this.playlists.some(playlist => playlist.name.toLowerCase() === trimmedName.toLowerCase() && playlist.id !== playlistId)) {
            alert('A playlist with this name already exists');
            return;
        }

        try {
            await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .doc(playlistId)
                .update({
                    name: trimmedName,
                    updatedAt: new Date()
                });

            await this.loadPlaylists();
            this.showNotification('Playlist renamed successfully!', 'success');

        } catch (error) {
            console.error('Error renaming playlist:', error);
            this.showNotification('Error renaming playlist: ' + error.message, 'error');
        }
    }

    async viewPlaylist(playlistId) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return;

        this.currentPlaylist = playlist;

        const modal = new bootstrap.Modal(document.getElementById('playlistModal'));
        const modalTitle = document.getElementById('playlistModalTitle');
        const tracksContainer = document.getElementById('playlistTracks');
        const emptyMessage = document.getElementById('emptyPlaylist');

        modalTitle.textContent = playlist.name;

        if (!playlist.tracks || playlist.tracks.length === 0) {
            tracksContainer.style.display = 'none';
            emptyMessage.style.display = 'block';
        } else {
            tracksContainer.style.display = 'block';
            emptyMessage.style.display = 'none';
            this.renderPlaylistTracksModal(playlist.tracks, tracksContainer);
        }

        modal.show();
    }

    renderPlaylistTracksModal(tracks, container) {
        container.innerHTML = tracks.map((track, index) => `
            <div class="track card mb-2" data-track-index="${index}">
                <div class="card-body d-flex align-items-center">
                    <img src="${track.cover}" class="track-cover me-3" alt="cover" style="width: 50px; height: 50px;">
                    <div class="flex-grow-1">
                        <div class="track-title fw-bold">${this.escapeHtml(track.title)}</div>
                        <div class="track-artist text-muted">${this.escapeHtml(track.artist)}</div>
                    </div>
                    <div class="track-duration text-muted small me-3">${this.formatTime(track.duration) || '--:--'}</div>
                    <div class="track-actions">
                        <button class="btn btn-outline-success btn-sm play-track"
                                data-track-index="${index}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm ms-2 remove-track"
                                data-track-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.play-track').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const trackIndex = parseInt(e.target.closest('.play-track').dataset.trackIndex);
                this.playTrackFromModal(trackIndex);
            });
        });

        container.querySelectorAll('.remove-track').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const trackIndex = parseInt(e.target.closest('.remove-track').dataset.trackIndex);
                this.removeTrackFromPlaylist(trackIndex);
            });
        });
    }

    playTrackFromModal(trackIndex) {
        if (!this.currentPlaylist) return;
        
        const track = this.currentPlaylist.tracks[trackIndex];
        if (track && window.loadTrack && window.playTrack) {
            window.currentPlaylistTracks = this.currentPlaylist.tracks;
            window.currentIndex = trackIndex;
            window.loadTrack(trackIndex);
            window.playTrack();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('playlistModal'));
            if (modal) {
                modal.hide();
            }
            
            this.showNotification(`Now playing: ${track.title}`, 'success');
        }
    }

    async removeTrackFromPlaylist(trackIndex) {
        if (!this.currentPlaylist) return;

        try {
            this.currentPlaylist.tracks.splice(trackIndex, 1);
            this.currentPlaylist.updatedAt = new Date();

            await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .doc(this.currentPlaylist.id)
                .update({
                    tracks: this.currentPlaylist.tracks,
                    updatedAt: this.currentPlaylist.updatedAt
                });

            this.viewPlaylist(this.currentPlaylist.id);
            await this.loadPlaylists();

            this.showNotification('Track removed from playlist', 'success');

        } catch (error) {
            console.error('Error removing track:', error);
            this.showNotification('Error removing track: ' + error.message, 'error');
        }
    }

    async downloadPlaylist(playlistId) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return;

        if (!playlist.tracks || playlist.tracks.length === 0) {
            this.showNotification('No tracks in this playlist to download', 'error');
            return;
        }

        this.downloadPlaylistTracks(playlist.tracks);
    }

    async deletePlaylist(playlistId) {
        if (!confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
            return;
        }

        try {
            await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .doc(playlistId)
                .delete();

            console.log('Playlist deleted:', playlistId);
            await this.loadPlaylists();

            this.showNotification('Playlist deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting playlist:', error);
            this.showNotification('Error deleting playlist: ' + error.message, 'error');
        }
    }

    async deleteCurrentPlaylist() {
        if (this.currentPlaylist) {
            await this.deletePlaylist(this.currentPlaylist.id);
            const modal = bootstrap.Modal.getInstance(document.getElementById('playlistModal'));
            if (modal) {
                modal.hide();
            }
        }
    }

    async handleSignOut() {
        try {
            await window.firebaseAuth.signOut();
            console.log('User signed out successfully');
            window.location.href = "Login.html";
        } catch (error) {
            console.error('Sign out error:', error);
            this.showNotification('Error signing out: ' + error.message, 'error');
        }
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return !!(this.initialized && this.currentUser && window.firebaseAuth && window.firebaseAuth.currentUser);
    }

    // Download all tracks from a playlist
    downloadPlaylistTracks(playlistTracks) {
        if (!playlistTracks || playlistTracks.length === 0) {
            alert('No tracks in playlist to download');
            return;
        }

        console.log(`Starting download of ${playlistTracks.length} tracks`);
        this.showNotification(`Downloading ${playlistTracks.length} tracks...`, 'success');

        playlistTracks.forEach((track, index) => {
            setTimeout(() => {
                this.downloadSingleTrack(track);
            }, index * 500);
        });

        setTimeout(() => {
            this.showNotification(`Started download of ${playlistTracks.length} tracks`, 'success');
        }, 100);
    }

    downloadSingleTrack(track) {
        if (!track || !track.file) {
            console.error('No track or file available for download');
            return;
        }

        console.log('Downloading:', track.file);
        
        const a = document.createElement('a');
        a.href = track.file;
        
        const filename = track.file.split('/').pop() || 
                        `${track.title} - ${track.artist}.${track.file.split('.').pop()}`;
        
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('Download initiated for:', filename);
    }

    showNotification(message, type) {
        const existingNotification = document.querySelector('.playlist-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `playlist-notification playlist-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Add to playlist functionality for main player
    async showAddToPlaylistMenu(track, buttonElement) {
        // Wait a moment for auth state to propagate if needed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if user is logged in using the playlist manager
        if (!this.isUserAuthenticated()) {
            alert('Please log in to use playlists');
            return;
        }

        const playlists = await this.getPlaylistsForTrack(track);
        
        // Create menu HTML
        const menuHTML = `
            <div class="playlist-menu">
                <div class="playlist-menu-header">
                    <h6>Add to Playlist</h6>
                    <button class="btn-close playlist-menu-close"></button>
                </div>
                <div class="playlist-menu-body">
                    ${playlists.length === 0 ? 
                        '<p class="text-muted">No playlists found. Create one in the Playlists page.</p>' : 
                        playlists.map(playlist => `
                            <div class="playlist-menu-item ${playlist.hasTrack ? 'in-playlist' : ''}" 
                                 data-playlist-id="${playlist.id}">
                                <i class="fas ${playlist.hasTrack ? 'fa-check' : 'fa-plus'} me-2"></i>
                                ${playlist.name}
                                ${playlist.hasTrack ? '<small class="text-muted">(Already added)</small>' : ''}
                            </div>
                        `).join('')
                    }
                </div>
                <div class="playlist-menu-footer">
                    <button class="btn btn-sm btn-outline-primary" onclick="window.location.href='playlist.html'">
                        <i class="fas fa-plus me-1"></i>Create New Playlist
                    </button>
                </div>
            </div>
        `;

        // Create and show menu
        const menu = document.createElement('div');
        menu.className = 'playlist-menu-container';
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);

        // Position menu near the button
        const rect = buttonElement.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.left = (rect.left) + 'px';
        menu.style.zIndex = '1000';

        // Add event listeners
        menu.querySelector('.playlist-menu-close').addEventListener('click', () => {
            menu.remove();
        });

        menu.querySelectorAll('.playlist-menu-item:not(.in-playlist)').forEach(item => {
            item.addEventListener('click', async () => {
                const playlistId = item.dataset.playlistId;
                const result = await this.addTrackToPlaylist(playlistId, track);
                
                if (result.success) {
                    item.classList.add('in-playlist');
                    const playlistName = playlists.find(p => p.id === playlistId).name;
                    item.innerHTML = `<i class="fas fa-check me-2"></i>${playlistName}<small class="text-muted">(Already added)</small>`;
                    this.showNotification(result.message, 'success');
                } else {
                    this.showNotification(result.message, 'error');
                }
            });
        });

        // Close menu when clicking outside
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== buttonElement) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    async addTrackToPlaylist(playlistId, track) {
        if (!this.isUserAuthenticated()) {
            return { success: false, message: 'Please log in to use playlists' };
        }

        try {
            const playlistRef = this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .doc(playlistId);

            const playlistDoc = await playlistRef.get();
            if (!playlistDoc.exists) {
                throw new Error('Playlist not found');
            }

            const playlist = playlistDoc.data();
            const tracks = playlist.tracks || [];

            // Check if track already exists in playlist
            if (tracks.some(t => t.file === track.file)) {
                return { success: false, message: 'Track already in playlist' };
            }

            // Add track to playlist
            tracks.push({
                title: track.title,
                artist: track.artist,
                file: track.file,
                cover: track.cover,
                duration: track.duration || 0,
                addedAt: new Date()
            });

            await playlistRef.update({
                tracks: tracks,
                updatedAt: new Date()
            });

            console.log('Track added to playlist:', playlistId);
            return { success: true, message: 'Track added to playlist' };

        } catch (error) {
            console.error('Error adding track to playlist:', error);
            if (error.code === 'failed-precondition') {
                return { success: false, message: 'Please check your internet connection' };
            }
            return { success: false, message: error.message };
        }
    }

    async getPlaylistsForTrack(track) {
        if (!this.isUserAuthenticated()) {
            return [];
        }

        try {
            const snapshot = await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .get();

            const playlists = [];
            snapshot.forEach(doc => {
                const playlist = doc.data();
                const hasTrack = (playlist.tracks || []).some(t => t.file === track.file);
                playlists.push({
                    id: doc.id,
                    name: playlist.name,
                    hasTrack: hasTrack
                });
            });

            return playlists;

        } catch (error) {
            console.error('Error getting playlists for track:', error);
            // Return empty array instead of failing
            return [];
        }
    }

    async loadPlaylistTracks(playlistId) {
        if (!this.isUserAuthenticated()) return [];

        try {
            const playlistDoc = await this.db.collection('users')
                .doc(this.currentUser.uid)
                .collection('playlists')
                .doc(playlistId)
                .get();

            if (playlistDoc.exists) {
                const playlist = playlistDoc.data();
                return playlist.tracks || [];
            }
            return [];

        } catch (error) {
            console.error('Error loading playlist tracks:', error);
            return [];
        }
    }

    // Utility methods
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatDate(date) {
        if (!date) return 'Unknown';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60)
            .toString()
            .padStart(2, "0");
        return `${m}:${s}`;
    }
}

// Initialize playlist manager when DOM is loaded
let playlistManagerFixed;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Initializing Playlist Manager...');
    playlistManagerFixed = new PlaylistManagerFixed();
    
    // Expose immediately for Spotify enhancer
    window.playlistManagerFixed = playlistManagerFixed;
    console.log('✅ Playlist Manager exposed globally as window.playlistManagerFixed');
});

// Also expose directly in case DOM ready fires later
window.playlistManagerFixed = playlistManagerFixed;