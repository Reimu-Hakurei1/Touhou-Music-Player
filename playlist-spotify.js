// Spotify Style Playlist Enhancement - Fixed Version with Music Player
class SpotifyPlaylistEnhancer {
    constructor() {
        this.playlistManager = null;
        this.initialized = false;
        this.maxWaitTime = 10000; // 10 seconds max
        this.startTime = Date.now();
        this.currentPlaylist = null;
        this.currentPlaylistTracks = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.audioElement = null;
        
        this.init();
    }

    async init() {
        console.log('🎵 Spotify Playlist Enhancer initializing...');
        
        try {
            // Wait for playlist manager
            await this.waitForPlaylistManager();
            
            if (this.playlistManager) {
                this.setupEventListeners();
                this.enhancePlaylistDisplay();
                this.initializeAudioElement();
                this.initialized = true;
                console.log('✅ Spotify Playlist Enhancer initialized successfully');
                
                // Initial render - will show loading or playlists
                this.renderSpotifyPlaylists();
                
                // Set up polling to check for loaded playlists
                this.startPlaylistPolling();
            } else {
                console.error('❌ Spotify Playlist Enhancer failed to initialize - no playlist manager');
                this.createFallbackPlaylistDisplay();
            }
        } catch (error) {
            console.error('❌ Spotify Playlist Enhancer initialization error:', error);
            this.createFallbackPlaylistDisplay();
        }
    }

    async waitForPlaylistManager() {
        return new Promise((resolve) => {
            console.log('🔍 Waiting for playlist manager...');
            let checks = 0;
            const maxChecks = 20; // 10 seconds at 500ms intervals
            
            const checkManager = () => {
                checks++;
                
                if (checks > maxChecks) {
                    console.log('❌ Timeout waiting for playlist manager');
                    console.log('🔍 Available globals:', {
                        playlistManagerFixed: !!window.playlistManagerFixed,
                        playlistManager: !!window.playlistManager
                    });
                    resolve();
                    return;
                }
                
                // Check for playlistManagerFixed
                if (window.playlistManagerFixed) {
                    this.playlistManager = window.playlistManagerFixed;
                    console.log('✅ Found playlistManagerFixed with', this.playlistManager.playlists?.length || 0, 'playlists');
                    resolve();
                } 
                // Fallback to any playlist manager
                else if (window.playlistManager) {
                    this.playlistManager = window.playlistManager;
                    console.log('✅ Found playlistManager with', this.playlistManager.playlists?.length || 0, 'playlists');
                    resolve();
                } else {
                    console.log(`⏳ Waiting for playlist manager... (${checks}/${maxChecks})`);
                    setTimeout(checkManager, 500);
                }
            };
            
            checkManager();
        });
    }

    startPlaylistPolling() {
        let pollCount = 0;
        const maxPolls = 30; // 15 seconds maximum
        
        const pollForPlaylists = () => {
            pollCount++;
            
            if (pollCount > maxPolls) {
                console.log('❌ Timeout waiting for playlists to load');
                return;
            }
            
            // Check if playlists are loaded and have data
            if (this.playlistManager && 
                this.playlistManager.playlists && 
                this.playlistManager.playlists.length > 0) {
                console.log(`✅ Playlists loaded! Found ${this.playlistManager.playlists.length} playlists`);
                this.renderSpotifyPlaylists();
                return;
            }
            
            // If no playlists yet, check again
            console.log(`🔄 Waiting for playlists to load... (${pollCount}/${maxPolls})`);
            setTimeout(pollForPlaylists, 500);
        };
        
        // Start polling
        setTimeout(pollForPlaylists, 1000);
    }

    createFallbackPlaylistDisplay() {
        console.log('🔄 Creating fallback playlist display...');
        const container = document.getElementById('playlistsGrid');
        if (!container) {
            console.error('❌ No playlist grid container found for fallback');
            return;
        }
        
        // Always show the create playlist option, even in fallback
        container.innerHTML = this.getEmptyStateHTML();
        
        console.log('✅ Fallback display created');
    }

    getEmptyStateHTML() {
        return `
            <div class="create-playlist-card" onclick="spotifyEnhancer.showCreatePlaylistModal()">
                <div class="create-playlist-icon">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="create-playlist-text">Create Playlist</div>
            </div>
            <div class="empty-state-container">
                <div class="empty-state-content">
                    <i class="fas fa-music fa-3x text-muted mb-3"></i>
                    <h4 class="text-white">No Playlists Yet</h4>
                    <p class="text-muted">Create your first playlist to get started!</p>
                </div>
            </div>
        `;
    }

    initializeAudioElement() {
        // Use existing audio element or create a new one
        this.audioElement = document.getElementById('audioEl');
        if (!this.audioElement) {
            this.audioElement = new Audio();
            this.audioElement.preload = 'metadata';
        }

        // Set up audio event listeners
        this.audioElement.addEventListener('loadedmetadata', () => {
            this.updateDurationDisplay();
        });

        this.audioElement.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        this.audioElement.addEventListener('ended', () => {
            this.playNextTrack();
        });

        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.showNotification('Error playing track', 'error');
        });

        console.log('✅ Audio element initialized');
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Close fullscreen button
        const closeFullscreenBtn = document.getElementById('closeFullscreen');
        if (closeFullscreenBtn) {
            closeFullscreenBtn.addEventListener('click', () => {
                this.closeFullscreen();
            });
        }

        // Fullscreen playlist actions
        const playFullscreenBtn = document.getElementById('playFullscreenPlaylist');
        if (playFullscreenBtn) {
            playFullscreenBtn.addEventListener('click', () => {
                this.playFullscreenPlaylist();
            });
        }

        const downloadFullscreenBtn = document.getElementById('downloadFullscreenPlaylist');
        if (downloadFullscreenBtn) {
            downloadFullscreenBtn.addEventListener('click', () => {
                this.downloadFullscreenPlaylist();
            });
        }

        const renameFullscreenBtn = document.getElementById('renameFullscreenPlaylist');
        if (renameFullscreenBtn) {
            renameFullscreenBtn.addEventListener('click', () => {
                this.renameFullscreenPlaylist();
            });
        }

        const deleteFullscreenBtn = document.getElementById('deleteFullscreenPlaylist');
        if (deleteFullscreenBtn) {
            deleteFullscreenBtn.addEventListener('click', () => {
                this.deleteFullscreenPlaylist();
            });
        }

        // Player controls
        const playBtn = document.getElementById('play');
        const prevBtn = document.getElementById('prev');
        const nextBtn = document.getElementById('next');
        const volumeSlider = document.getElementById('volumeSlider');
        const progress = document.getElementById('progress');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.playPreviousTrack();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.playNextTrack();
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }

        if (progress) {
            progress.addEventListener('click', (e) => {
                this.seekTrack(e);
            });
        }

        // Big player controls
        const bigPlayBtn = document.getElementById('bigPlay');
        const bigPrevBtn = document.getElementById('bigPrev');
        const bigNextBtn = document.getElementById('bigNext');
        const bigVolumeSlider = document.getElementById('bigVolumeSlider');
        const bigProgress = document.getElementById('bigProgress');

        if (bigPlayBtn) {
            bigPlayBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }

        if (bigPrevBtn) {
            bigPrevBtn.addEventListener('click', () => {
                this.playPreviousTrack();
            });
        }

        if (bigNextBtn) {
            bigNextBtn.addEventListener('click', () => {
                this.playNextTrack();
            });
        }

        if (bigVolumeSlider) {
            bigVolumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }

        if (bigProgress) {
            bigProgress.addEventListener('click', (e) => {
                this.seekTrack(e);
            });
        }

        // Escape key to close fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeFullscreen();
            }
        });

        // Modal close events to fix grey background
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.classList.remove('modal-open');
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
            });
        });

        console.log('✅ Event listeners setup complete');
    }

    enhancePlaylistDisplay() {
        console.log('🎨 Enhancing playlist display...');
        
        // Hide the create playlist section (the bar) but keep the create card
        this.hideCreatePlaylistBar();
        
        // Hide original playlist container and show our grid
        this.hideOriginalPlaylistCards();
        
        // Hide the original noPlaylists element
        this.hideOriginalNoPlaylists();
        
        console.log('✅ Playlist display enhanced');
    }

    hideCreatePlaylistBar() {
        const createPlaylistSection = document.querySelector('.create-playlist-section');
        if (createPlaylistSection) {
            createPlaylistSection.style.display = 'none';
            console.log('✅ Hidden create playlist bar');
        }
    }

    hideOriginalPlaylistCards() {
        const originalContainer = document.getElementById('playlistsContainer');
        if (originalContainer) {
            originalContainer.style.display = 'none';
            console.log('✅ Hidden original playlist container');
        }
        
        const spotifyGrid = document.getElementById('playlistsGrid');
        if (spotifyGrid) {
            spotifyGrid.style.display = 'grid';
            console.log('✅ Showing Spotify grid');
        }
    }

    hideOriginalNoPlaylists() {
        const noPlaylists = document.getElementById('noPlaylists');
        if (noPlaylists) {
            noPlaylists.style.display = 'none';
            console.log('✅ Hidden original noPlaylists element');
        }
    }

    renderSpotifyPlaylists() {
        const container = document.getElementById('playlistsGrid');

        if (!container) {
            console.error('❌ Playlist grid container not found');
            return;
        }

        // Check if we have playlists data
        if (!this.playlistManager || !this.playlistManager.playlists) {
            console.log('🔄 Playlist data not ready yet, showing loading state...');
            container.innerHTML = this.getLoadingSpinner();
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Always show the create playlist card, even when there are no playlists
        const createCard = document.createElement('div');
        createCard.className = 'create-playlist-card';
        createCard.onclick = () => this.showCreatePlaylistModal();
        createCard.innerHTML = `
            <div class="create-playlist-icon">
                <i class="fas fa-plus"></i>
            </div>
            <div class="create-playlist-text">Create Playlist</div>
        `;
        container.appendChild(createCard);

        console.log(`🎵 Rendering ${this.playlistManager.playlists.length} playlists in Spotify style`);

        // Create Spotify-style playlist cards for existing playlists
        this.playlistManager.playlists.forEach(playlist => {
            const playlistCard = this.createSpotifyPlaylistCard(playlist);
            container.appendChild(playlistCard);
        });

        console.log('✅ Spotify playlists rendered successfully');
    }

    getLoadingSpinner() {
        return `
            <div class="create-playlist-card" onclick="spotifyEnhancer.showCreatePlaylistModal()">
                <div class="create-playlist-icon">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="create-playlist-text">Create Playlist</div>
            </div>
            <div class="empty-state-container">
                <div class="empty-state-content">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading playlists...</span>
                    </div>
                    <p class="text-muted">Loading your playlists...</p>
                </div>
            </div>
        `;
    }

    createSpotifyPlaylistCard(playlist) {
        const card = document.createElement('div');
        card.className = 'playlist-card-spotify';
        card.dataset.playlistId = playlist.id;
        
        // Use first track's cover as background if available, otherwise use gradient
        const coverUrl = playlist.tracks && playlist.tracks.length > 0 ? 
            playlist.tracks[0].cover : '';
        
        card.innerHTML = `
            ${coverUrl ? `<img class="playlist-cover" src="${coverUrl}" alt="${playlist.name}" onerror="this.style.display='none'">` : ''}
            <div class="playlist-overlay">
                <div class="playlist-info">
                    <div class="playlist-name">${this.escapeHtml(playlist.name)}</div>
                    <div class="playlist-details">${playlist.tracks ? playlist.tracks.length : 0} tracks</div>
                    <div class="playlist-actions">
                        <button class="playlist-action-btn play" title="Play playlist">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="playlist-action-btn" title="View playlist">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="playlist-action-btn" title="Download playlist">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const playBtn = card.querySelector('.playlist-action-btn.play');
        const viewBtn = card.querySelector('.playlist-action-btn:nth-child(2)');
        const downloadBtn = card.querySelector('.playlist-action-btn:nth-child(3)');

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playPlaylist(playlist.id, playlist.name);
        });

        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFullscreen(playlist);
        });

        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadPlaylist(playlist.id, playlist.name);
        });

        // Click on card opens fullscreen
        card.addEventListener('click', () => {
            this.openFullscreen(playlist);
        });

        return card;
    }

    async openFullscreen(playlist) {
        console.log('🔄 Opening fullscreen view for playlist:', playlist.name);
        
        this.currentPlaylist = playlist;
        this.currentPlaylistTracks = playlist.tracks || [];
        
        // Ensure we have the latest track data
        if ((!playlist.tracks || playlist.tracks.length === 0) && this.playlistManager.loadPlaylistTracksForSpotify) {
            console.log('🔄 Loading tracks for fullscreen view...');
            playlist.tracks = await this.playlistManager.loadPlaylistTracksForSpotify(playlist.id);
            this.currentPlaylistTracks = playlist.tracks;
        }
        
        // Update fullscreen UI
        const coverImg = document.getElementById('fullscreenCover');
        if (coverImg) {
            coverImg.src = playlist.tracks && playlist.tracks.length > 0 ? 
                playlist.tracks[0].cover : '';
            coverImg.alt = playlist.name;
        }
        
        const titleEl = document.getElementById('fullscreenTitle');
        if (titleEl) {
            titleEl.textContent = playlist.name;
        }
        
        const statsEl = document.getElementById('fullscreenStats');
        if (statsEl) {
            statsEl.textContent = `${playlist.tracks ? playlist.tracks.length : 0} track${playlist.tracks && playlist.tracks.length !== 1 ? 's' : ''}`;
        }
        
        // Render tracks
        this.renderFullscreenTracks(playlist.tracks || []);
        
        // Show fullscreen view
        const fullscreenEl = document.getElementById('playlistFullscreen');
        if (fullscreenEl) {
            fullscreenEl.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('✅ Fullscreen view opened with', playlist.tracks?.length || 0, 'tracks');
        }
    }

    closeFullscreen() {
        console.log('🔄 Closing fullscreen view');
        const fullscreenEl = document.getElementById('playlistFullscreen');
        if (fullscreenEl) {
            fullscreenEl.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    renderFullscreenTracks(tracks) {
        const container = document.getElementById('fullscreenTracks');
        
        if (!container) return;

        if (!tracks || tracks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-music fa-3x text-muted mb-3"></i>
                    <h4 class="text-white">No Tracks in Playlist</h4>
                    <p class="text-muted">Add some tracks to this playlist from the main player!</p>
                    <button class="btn btn-primary mt-3" onclick="window.location.href='index.html'">
                        <i class="fas fa-arrow-left me-2"></i>Go to Player
                    </button>
                </div>
            `;
            return;
        }

        console.log(`🎵 Rendering ${tracks.length} tracks in fullscreen view`);

        container.innerHTML = tracks.map((track, index) => `
            <div class="playlist-track" data-track-index="${index}">
                <div class="track-number">${index + 1}</div>
                <div class="track-info">
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-duration">${this.formatTime(track.duration) || '--:--'}</div>
                <div class="track-actions">
                    <button class="track-action-btn play-track" title="Play">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="track-action-btn remove-track" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for track actions
        container.querySelectorAll('.play-track').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrackFromFullscreen(index);
            });
        });

        container.querySelectorAll('.remove-track').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTrackFromFullscreen(index);
            });
        });

        // Click on track row to play
        container.querySelectorAll('.playlist-track').forEach((trackEl, index) => {
            trackEl.addEventListener('click', () => {
                this.playTrackFromFullscreen(index);
            });
        });
    }

    playTrackFromFullscreen(index) {
        if (!this.currentPlaylist || !this.currentPlaylistTracks || this.currentPlaylistTracks.length === 0) {
            this.showNotification('No tracks available to play', 'error');
            return;
        }
        
        const track = this.currentPlaylistTracks[index];
        if (track) {
            this.currentTrackIndex = index;
            this.loadTrack(track);
            this.playTrack();
            this.showNotification(`Now playing: ${track.title}`, 'success');
            
            // Update active track in fullscreen view
            this.updateActiveTrackInFullscreen();
        }
    }

    loadTrack(track) {
        if (!track || !track.file) {
            console.error('No track or file to load');
            return;
        }

        console.log('🎵 Loading track:', track.title);
        
        // Stop current playback
        this.audioElement.pause();
        
        // Set new source
        this.audioElement.src = track.file;
        
        // Update player UI
        this.updatePlayerUI(track);
        
        // Load the track
        this.audioElement.load();
    }

    updatePlayerUI(track) {
        // Update mini player
        const miniCover = document.getElementById('miniCover');
        const songTitle = document.getElementById('songTitleInner');
        const songArtist = document.getElementById('songArtist');
        
        if (miniCover) miniCover.src = track.cover || '';
        if (songTitle) songTitle.textContent = track.title;
        if (songArtist) songArtist.textContent = track.artist;

        // Update big player
        const bigCover = document.getElementById('bigPlayerCover');
        const bigTitle = document.getElementById('bigPlayerTitle');
        const bigArtist = document.getElementById('bigPlayerArtist');
        
        if (bigCover) bigCover.src = track.cover || '';
        if (bigTitle) bigTitle.textContent = track.title;
        if (bigArtist) bigArtist.textContent = track.artist;
    }

    async playTrack() {
        try {
            await this.audioElement.play();
            this.isPlaying = true;
            this.updatePlayButton();
            console.log('▶️ Now playing:', this.currentPlaylistTracks[this.currentTrackIndex]?.title);
        } catch (error) {
            console.error('Error playing track:', error);
            this.showNotification('Error playing track', 'error');
        }
    }

    pauseTrack() {
        this.audioElement.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        console.log('⏸️ Playback paused');
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pauseTrack();
        } else {
            this.playTrack();
        }
    }

    updatePlayButton() {
        const playBtn = document.getElementById('play');
        const bigPlayBtn = document.getElementById('bigPlay');
        
        const playIcon = this.isPlaying ? '⏸' : '▶';
        
        if (playBtn) playBtn.textContent = playIcon;
        if (bigPlayBtn) bigPlayBtn.textContent = playIcon;
    }

    playNextTrack() {
        if (!this.currentPlaylistTracks || this.currentPlaylistTracks.length === 0) {
            this.showNotification('No tracks in playlist', 'error');
            return;
        }

        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentPlaylistTracks.length;
        const nextTrack = this.currentPlaylistTracks[this.currentTrackIndex];
        
        this.loadTrack(nextTrack);
        this.playTrack();
        this.updateActiveTrackInFullscreen();
    }

    playPreviousTrack() {
        if (!this.currentPlaylistTracks || this.currentPlaylistTracks.length === 0) {
            this.showNotification('No tracks in playlist', 'error');
            return;
        }

        this.currentTrackIndex = this.currentTrackIndex > 0 ? this.currentTrackIndex - 1 : this.currentPlaylistTracks.length - 1;
        const prevTrack = this.currentPlaylistTracks[this.currentTrackIndex];
        
        this.loadTrack(prevTrack);
        this.playTrack();
        this.updateActiveTrackInFullscreen();
    }

    updateActiveTrackInFullscreen() {
        const tracks = document.querySelectorAll('.playlist-track');
        tracks.forEach((track, index) => {
            if (index === this.currentTrackIndex) {
                track.classList.add('active');
            } else {
                track.classList.remove('active');
            }
        });
    }

    setVolume(volume) {
        this.audioElement.volume = volume;
        
        // Update volume sliders
        const volumeSlider = document.getElementById('volumeSlider');
        const bigVolumeSlider = document.getElementById('bigVolumeSlider');
        
        if (volumeSlider) volumeSlider.value = volume * 100;
        if (bigVolumeSlider) bigVolumeSlider.value = volume * 100;
    }

    seekTrack(e) {
        if (!this.audioElement.duration) return;
        
        const progressBar = e.currentTarget;
        const clickPosition = e.offsetX;
        const progressBarWidth = progressBar.clientWidth;
        const percentage = clickPosition / progressBarWidth;
        
        this.audioElement.currentTime = percentage * this.audioElement.duration;
    }

    updateProgress() {
        const currentTime = this.audioElement.currentTime;
        const duration = this.audioElement.duration;
        
        // Update time displays
        const curTime = document.getElementById('curTime');
        const durTime = document.getElementById('durTime');
        const bigCurTime = document.getElementById('bigCurTime');
        const bigDurTime = document.getElementById('bigDurTime');
        
        if (curTime) curTime.textContent = this.formatTime(currentTime);
        if (durTime) durTime.textContent = this.formatTime(duration);
        if (bigCurTime) bigCurTime.textContent = this.formatTime(currentTime);
        if (bigDurTime) bigDurTime.textContent = this.formatTime(duration);
        
        // Update progress bars
        const progress = (currentTime / duration) * 100 || 0;
        
        const progressBar = document.getElementById('progressBar');
        const thumb = document.getElementById('thumb');
        const bigProgressBar = document.getElementById('bigProgressBar');
        const bigThumb = document.getElementById('bigThumb');
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (thumb) thumb.style.left = `${progress}%`;
        if (bigProgressBar) bigProgressBar.style.width = `${progress}%`;
        if (bigThumb) bigThumb.style.left = `${progress}%`;
    }

    updateDurationDisplay() {
        const duration = this.audioElement.duration;
        const durTime = document.getElementById('durTime');
        const bigDurTime = document.getElementById('bigDurTime');
        
        if (durTime) durTime.textContent = this.formatTime(duration);
        if (bigDurTime) bigDurTime.textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async removeTrackFromFullscreen(index) {
        if (!this.currentPlaylist || !this.playlistManager) {
            this.showNotification('Cannot remove track', 'error');
            return;
        }

        try {
            // Remove track from the playlist
            this.currentPlaylist.tracks.splice(index, 1);
            this.currentPlaylistTracks = this.currentPlaylist.tracks;
            
            // Update in Firebase
            if (this.playlistManager.db && this.playlistManager.currentUser) {
                await this.playlistManager.db.collection('users')
                    .doc(this.playlistManager.currentUser.uid)
                    .collection('playlists')
                    .doc(this.currentPlaylist.id)
                    .update({
                        tracks: this.currentPlaylist.tracks,
                        updatedAt: new Date()
                    });
            }

            // Update the fullscreen view
            this.renderFullscreenTracks(this.currentPlaylist.tracks);
            
            // Update the stats
            const statsEl = document.getElementById('fullscreenStats');
            if (statsEl) {
                statsEl.textContent = `${this.currentPlaylist.tracks.length} track${this.currentPlaylist.tracks.length !== 1 ? 's' : ''}`;
            }
            
            // Refresh the main playlist view
            if (this.playlistManager.loadPlaylists) {
                await this.playlistManager.loadPlaylists();
                this.renderSpotifyPlaylists();
            }

            this.showNotification('Track removed from playlist', 'success');

        } catch (error) {
            console.error('Error removing track:', error);
            this.showNotification('Error removing track', 'error');
        }
    }

    playPlaylist(playlistId, playlistName) {
        console.log('🎵 Playing playlist:', playlistName);
        
        // Find the playlist
        const playlist = this.playlistManager.playlists.find(p => p.id === playlistId);
        if (!playlist) {
            this.showNotification('Playlist not found', 'error');
            return;
        }

        // Set current playlist and tracks
        this.currentPlaylist = playlist;
        this.currentPlaylistTracks = playlist.tracks || [];
        
        if (this.currentPlaylistTracks.length === 0) {
            this.showNotification('No tracks in this playlist', 'error');
            return;
        }

        // Play first track
        this.currentTrackIndex = 0;
        const firstTrack = this.currentPlaylistTracks[0];
        this.loadTrack(firstTrack);
        this.playTrack();
        
        this.showNotification(`Now playing: ${playlistName}`, 'success');
    }

    playFullscreenPlaylist() {
        if (!this.currentPlaylist || !this.currentPlaylistTracks || this.currentPlaylistTracks.length === 0) {
            this.showNotification('No tracks to play', 'error');
            return;
        }

        this.currentTrackIndex = 0;
        const firstTrack = this.currentPlaylistTracks[0];
        this.loadTrack(firstTrack);
        this.playTrack();
        this.updateActiveTrackInFullscreen();
        
        this.showNotification(`Now playing: ${this.currentPlaylist.name}`, 'success');
    }

    downloadPlaylist(playlistId, playlistName) {
        console.log('📥 Downloading playlist:', playlistName);
        
        // Find the playlist
        const playlist = this.playlistManager.playlists.find(p => p.id === playlistId);
        if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
            this.showNotification('No tracks to download', 'error');
            return;
        }

        // Use the main player's download function
        if (window.downloadPlaylist) {
            window.downloadPlaylist(playlist.tracks);
            this.showNotification(`Downloading playlist: ${playlistName}`, 'success');
        } else {
            this.showNotification(`Would download playlist: ${playlistName}`, 'success');
        }
    }

    downloadFullscreenPlaylist() {
        if (!this.currentPlaylist || !this.currentPlaylistTracks || this.currentPlaylistTracks.length === 0) {
            this.showNotification('No tracks to download', 'error');
            return;
        }

        if (window.downloadPlaylist) {
            window.downloadPlaylist(this.currentPlaylistTracks);
            this.showNotification(`Downloading playlist: ${this.currentPlaylist.name}`, 'success');
        } else {
            this.showNotification('Download functionality not available', 'error');
        }
    }

    async renameFullscreenPlaylist() {
        if (!this.currentPlaylist) return;
        
        const newName = prompt('Enter new playlist name:', this.currentPlaylist.name);
        if (!newName || newName.trim() === '') return;

        const trimmedName = newName.trim();
        if (trimmedName === this.currentPlaylist.name) return;

        try {
            // Use the playlist manager's rename functionality
            if (this.playlistManager.renamePlaylist) {
                await this.playlistManager.renamePlaylist(this.currentPlaylist.id, trimmedName);
                this.showNotification('Playlist renamed successfully', 'success');
                this.closeFullscreen();
            } else {
                this.showNotification('Rename functionality not available', 'error');
            }
        } catch (error) {
            this.showNotification('Error renaming playlist', 'error');
        }
    }

    async deleteFullscreenPlaylist() {
        if (!this.currentPlaylist) return;

        // Only ask for confirmation once
        if (!confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
            return;
        }

        try {
            // Use the playlist manager's delete functionality directly
            // This avoids the duplicate confirmation that might be in the playlistManager.deletePlaylist method
            if (this.playlistManager.db && this.playlistManager.currentUser) {
                // Delete from Firebase directly
                await this.playlistManager.db.collection('users')
                    .doc(this.playlistManager.currentUser.uid)
                    .collection('playlists')
                    .doc(this.currentPlaylist.id)
                    .delete();
                
                // Remove from local array
                const index = this.playlistManager.playlists.findIndex(p => p.id === this.currentPlaylist.id);
                if (index !== -1) {
                    this.playlistManager.playlists.splice(index, 1);
                }
                
                this.showNotification('Playlist deleted successfully', 'success');
                this.closeFullscreen();
                
                // Refresh the playlist view
                this.renderSpotifyPlaylists();
            } else if (this.playlistManager.deletePlaylist) {
                // If deletePlaylist exists but doesn't ask for confirmation, use it
                await this.playlistManager.deletePlaylist(this.currentPlaylist.id);
                this.showNotification('Playlist deleted successfully', 'success');
                this.closeFullscreen();
                
                // Refresh the playlist view
                if (this.playlistManager.loadPlaylists) {
                    await this.playlistManager.loadPlaylists();
                    this.renderSpotifyPlaylists();
                }
            } else {
                this.showNotification('Delete functionality not available', 'error');
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            this.showNotification('Error deleting playlist', 'error');
        }
    }

    // Fixed create playlist modal functionality
    showCreatePlaylistModal() {
        const modal = new bootstrap.Modal(document.getElementById('createPlaylistModal'));
        
        // Clear the input field when modal opens
        const input = document.getElementById('newPlaylistNameModal');
        if (input) {
            input.value = '';
        }
        
        // Set up event listener for create button
        const createBtn = document.getElementById('createPlaylistModalBtn');
        if (createBtn) {
            // Remove any existing event listeners
            createBtn.replaceWith(createBtn.cloneNode(true));
            
            // Get the new button reference
            const newCreateBtn = document.getElementById('createPlaylistModalBtn');
            
            // Add single event listener
            newCreateBtn.addEventListener('click', () => {
                this.createPlaylistFromModal();
            });
        }
        
        // Set up enter key listener
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.createPlaylistFromModal();
                }
            });
        }
        
        modal.show();
        
        // Focus the input field
        setTimeout(() => {
            if (input) {
                input.focus();
            }
        }, 500);
    }

    async createPlaylistFromModal() {
        const modalInput = document.getElementById('newPlaylistNameModal');
        const name = modalInput?.value.trim();

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

        // Check if playlist name already exists
        if (this.playlistManager.playlists.some(playlist => playlist.name.toLowerCase() === name.toLowerCase())) {
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

            const docRef = await this.playlistManager.db.collection('users')
                .doc(this.playlistManager.currentUser.uid)
                .collection('playlists')
                .add(playlist);

            console.log('Playlist created with ID:', docRef.id);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createPlaylistModal'));
            if (modal) {
                modal.hide();
            }
            
            // Clear input
            if (modalInput) {
                modalInput.value = '';
            }
            
            // Refresh playlists - wait a moment for Firebase to update
            setTimeout(async () => {
                await this.playlistManager.loadPlaylists();
                this.renderSpotifyPlaylists();
            }, 1000);

            this.showNotification('Playlist created successfully!', 'success');

        } catch (error) {
            console.error('Error creating playlist:', error);
            this.showNotification('Error creating playlist: ' + error.message, 'error');
        }
    }

    isUserAuthenticated() {
        return !!(this.playlistManager && this.playlistManager.currentUser);
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

    // Utility methods
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize Spotify enhancer when DOM is loaded
let spotifyEnhancer;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 DOM loaded, starting Spotify enhancer...');
    spotifyEnhancer = new SpotifyPlaylistEnhancer();
});