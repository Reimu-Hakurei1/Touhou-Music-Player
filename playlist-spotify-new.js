// ================== R2 BASE URL ==================
// Check if R2_BASE already exists before declaring
if (typeof R2_BASE === 'undefined') {
  const R2_BASE = "https://pub-ce8938dd87f442ef8827efc2a61b6976.r2.dev/";

  function resolveMediaUrl(path) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return R2_BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
  }
}

console.log("🚀 playlist-spotify.js loaded");

class SpotifyPlaylistEnhancer {
    constructor() {
        this.playlistManager = null;
        this.initialized = false;
        this.currentPlaylist = null;
        this.currentPlaylistTracks = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.audioElement = null;
        this._pollTimer = null;
        this._boundOnPlaylistsUpdated = null;

        this.init();
    }

    async init() {
        console.log("🎵 Spotify Playlist Enhancer initializing...");

        try {
            console.log("🔄 Waiting for playlist manager...");
            await this.waitForPlaylistManager();

            if (!this.playlistManager) {
                console.error("❌ No playlist manager found on window");
                this.createFallbackPlaylistDisplay("Playlist manager not found. Is the playlist script loaded?");
                return;
            }

            console.log("✅ Playlist manager found, setting up...");
            this.setupEventListeners();
            this.enhancePlaylistDisplay();
            this.initializeAudioElement();
            this.listenForPlaylistUpdates();
            this.initialized = true;

            // Try to force-load playlists if the manager supports it
            console.log("🔄 Trying to load playlists...");
            await this.tryLoadPlaylists();

            console.log("🎨 Rendering playlists...");
            this.renderSpotifyPlaylists();
            this.startPlaylistPolling();

            console.log("✅ Spotify Playlist Enhancer ready");
        } catch (error) {
            console.error("❌ Init error:", error);
            this.createFallbackPlaylistDisplay("Init error: " + (error.message || error));
        }
    }

    async waitForPlaylistManager() {
        const maxChecks = 40; // ~20s
        const interval = 500;

        for (let i = 0; i < maxChecks; i++) {
            const manager =
                window.playlistManagerFixed ||
                window.playlistManager ||
                window.PlaylistManagerInstance ||
                null;

            if (manager) {
                this.playlistManager = manager;
                console.log("✅ Playlist manager found:", {
                    source: window.playlistManagerFixed
                        ? "playlistManagerFixed"
                        : window.playlistManager
                        ? "playlistManager"
                        : "PlaylistManagerInstance",
                    playlists: manager.playlists?.length ?? "n/a",
                    hasLoad: typeof manager.loadPlaylists === "function",
                    user: !!(manager.currentUser || manager.user)
                });
                return;
            }

            if (i % 4 === 0) {
                console.log(`⏳ Waiting for playlist manager... (${i + 1}/${maxChecks})`, {
                    playlistManagerFixed: !!window.playlistManagerFixed,
                    playlistManager: !!window.playlistManager
                });
            }

            await new Promise((r) => setTimeout(r, interval));
        }
    }

    async tryLoadPlaylists() {
        if (!this.playlistManager) return;

        try {
            if (typeof this.playlistManager.loadPlaylists === "function") {
                console.log("🔄 Calling playlistManager.loadPlaylists()...");
                await this.playlistManager.loadPlaylists();
            } else if (typeof this.playlistManager.init === "function" && !this.playlistManager.playlists) {
                console.log("🔄 Calling playlistManager.init()...");
                await this.playlistManager.init();
            }
        } catch (e) {
            console.warn("loadPlaylists failed (may be normal if not logged in):", e);
        }
    }

    listenForPlaylistUpdates() {
        // Re-render when other scripts announce that playlists changed
        this._boundOnPlaylistsUpdated = () => {
            console.log("📢 playlistsUpdated event received");
            this.renderSpotifyPlaylists();
        };
        window.addEventListener("playlistsUpdated", this._boundOnPlaylistsUpdated);

        // Also poll the manager array in case no event is fired
        // (handled by startPlaylistPolling)
    }

    startPlaylistPolling() {
        let pollCount = 0;
        const maxPolls = 60; // 30s

        const tick = () => {
            pollCount++;
            if (pollCount > maxPolls) {
                console.log("⏹ Stopped playlist polling");
                return;
            }

            const count = this.playlistManager?.playlists?.length || 0;
            if (count > 0) {
                console.log(`✅ Playlists available (${count}) — rendering`);
                this.renderSpotifyPlaylists();
                // keep a light poll in case they change later
                this._pollTimer = setTimeout(tick, 3000);
                return;
            }

            // still empty — keep trying a bit
            if (pollCount % 4 === 0) {
                console.log(`🔄 Still 0 playlists (${pollCount}/${maxPolls})`, {
                    manager: !!this.playlistManager,
                    playlistsType: Array.isArray(this.playlistManager?.playlists)
                        ? "array"
                        : typeof this.playlistManager?.playlists,
                    user: !!(this.playlistManager?.currentUser || this.playlistManager?.user)
                });
            }
            this._pollTimer = setTimeout(tick, 500);
        };

        this._pollTimer = setTimeout(tick, 500);
    }

    createFallbackPlaylistDisplay(message) {
        const container = document.getElementById("playlistsGrid");
        if (!container) {
            console.error("❌ #playlistsGrid not found in DOM");
            return;
        }

        container.style.display = "grid";
        container.innerHTML = `
            <div class="create-playlist-card" onclick="spotifyEnhancer.showCreatePlaylistModal()">
                <div class="create-playlist-icon"><i class="fas fa-plus"></i></div>
                <div class="create-playlist-text">Create Playlist</div>
            </div>
            <div class="empty-state-container">
                <div class="empty-state-content">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h4 class="text-white">Playlists unavailable</h4>
                    <p class="text-muted">${this.escapeHtml(message || "Unknown error")}</p>
                    <button class="btn btn-outline-light btn-sm mt-2" onclick="location.reload()">Reload</button>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="create-playlist-card" onclick="spotifyEnhancer.showCreatePlaylistModal()">
                <div class="create-playlist-icon"><i class="fas fa-plus"></i></div>
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
        this.audioElement = document.getElementById("audioEl");
        if (!this.audioElement) {
            this.audioElement = new Audio();
            this.audioElement.preload = "metadata";
        }

        this.audioElement.addEventListener("loadedmetadata", () => this.updateDurationDisplay());
        this.audioElement.addEventListener("timeupdate", () => this.updateProgress());
        this.audioElement.addEventListener("ended", () => this.playNextTrack());
        this.audioElement.addEventListener("error", (e) => {
            console.error("Audio error:", e);
            this.showNotification("Error playing track", "error");
        });
    }

    setupEventListeners() {
        const bind = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("click", handler);
        };

        bind("closeFullscreen", () => this.closeFullscreen());
        bind("playFullscreenPlaylist", () => this.playFullscreenPlaylist());
        bind("downloadFullscreenPlaylist", () => this.downloadFullscreenPlaylist());
        bind("renameFullscreenPlaylist", () => this.renameFullscreenPlaylist());
        bind("deleteFullscreenPlaylist", () => this.deleteFullscreenPlaylist());

        bind("play", () => this.togglePlayPause());
        bind("prev", () => this.playPreviousTrack());
        bind("next", () => this.playNextTrack());
        bind("bigPlay", () => this.togglePlayPause());
        bind("bigPrev", () => this.playPreviousTrack());
        bind("bigNext", () => this.playNextTrack());

        const volumeSlider = document.getElementById("volumeSlider");
        if (volumeSlider) {
            volumeSlider.addEventListener("input", (e) => this.setVolume(e.target.value / 100));
        }
        const bigVolumeSlider = document.getElementById("bigVolumeSlider");
        if (bigVolumeSlider) {
            bigVolumeSlider.addEventListener("input", (e) => this.setVolume(e.target.value / 100));
        }

        const progress = document.getElementById("progress");
        if (progress) progress.addEventListener("click", (e) => this.seekTrack(e));
        const bigProgress = document.getElementById("bigProgress");
        if (bigProgress) bigProgress.addEventListener("click", (e) => this.seekTrack(e));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.closeFullscreen();
        });

        document.querySelectorAll(".modal").forEach((modal) => {
            modal.addEventListener("hidden.bs.modal", () => {
                document.body.classList.remove("modal-open");
                document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
            });
        });
    }

    enhancePlaylistDisplay() {
        const createSection = document.querySelector(".create-playlist-section");
        if (createSection) createSection.style.display = "none";

        const original = document.getElementById("playlistsContainer");
        if (original) original.style.display = "none";

        const noPlaylists = document.getElementById("noPlaylists");
        if (noPlaylists) noPlaylists.style.display = "none";

        const grid = document.getElementById("playlistsGrid");
        if (grid) {
            grid.style.display = "grid";
        } else {
            console.error("❌ #playlistsGrid missing — playlists cannot render");
        }
    }

    getPlaylistsArray() {
        const m = this.playlistManager;
        if (!m) return [];
        if (Array.isArray(m.playlists)) return m.playlists;
        if (Array.isArray(m.userPlaylists)) return m.userPlaylists;
        return [];
    }

    renderSpotifyPlaylists() {
        const container = document.getElementById("playlistsGrid");
        if (!container) {
            console.error("❌ #playlistsGrid not found");
            return;
        }

        // Force visibility with inline styles
        container.style.display = "grid";
        container.style.visibility = "visible";
        container.style.opacity = "1";
        container.style.position = "relative";
        container.style.zIndex = "10";
        container.style.minHeight = "400px";
        container.style.width = "100%";
        container.style.padding = "20px";

        console.log("🎨 Container styles applied:", {
            display: container.style.display,
            visibility: container.style.visibility,
            opacity: container.style.opacity,
            zIndex: container.style.zIndex,
            children: container.children.length
        });

        if (!this.playlistManager) {
            this.createFallbackPlaylistDisplay("Playlist manager not connected");
            return;
        }

        const playlists = this.getPlaylistsArray();
        console.log(`🎵 Spotify enhancer: Got ${playlists.length} playlists from manager`);

        // Not logged in?
        const user = this.playlistManager.currentUser || this.playlistManager.user;
        if (!user && playlists.length === 0) {
            container.innerHTML = `
                <div class="empty-state-container" style="grid-column: 1 / -1; visibility: visible; opacity: 1; display: block;">
                    <div class="empty-state-content">
                        <i class="fas fa-user-lock fa-3x text-muted mb-3"></i>
                        <h4 class="text-white">Please log in</h4>
                        <p class="text-muted">Sign in to see and create playlists.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = "";

        // Always show create card
        const createCard = document.createElement("div");
        createCard.className = "create-playlist-card";
        createCard.style.visibility = "visible";
        createCard.style.opacity = "1";
        createCard.style.display = "flex";
        createCard.style.position = "relative";
        createCard.style.zIndex = "5";
        createCard.onclick = () => this.showCreatePlaylistModal();
        createCard.innerHTML = `
            <div class="create-playlist-icon"><i class="fas fa-plus"></i></div>
            <div class="create-playlist-text">Create Playlist</div>
        `;
        container.appendChild(createCard);

        if (playlists.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state-container";
            empty.style.gridColumn = "1 / -1";
            empty.style.visibility = "visible";
            empty.style.opacity = "1";
            empty.style.display = "block";
            empty.style.position = "relative";
            empty.style.zIndex = "5";
            empty.innerHTML = `
                <div class="empty-state-content">
                    <i class="fas fa-music fa-3x text-muted mb-3"></i>
                    <h4 class="text-white">No Playlists Yet</h4>
                    <p class="text-muted">Create your first playlist to get started!</p>
                </div>
            `;
            container.appendChild(empty);
            console.log("ℹ️ Rendered empty playlist state");
            return;
        }

        console.log(`🎵 Rendering ${playlists.length} playlists`);
        playlists.forEach((playlist) => {
            console.log(`  - Rendering: ${playlist.name} (${playlist.tracks?.length || 0} tracks)`);
            const card = this.createSpotifyPlaylistCard(playlist);
            card.style.visibility = "visible";
            card.style.opacity = "1";
            card.style.display = "block";
            card.style.position = "relative";
            card.style.zIndex = "5";
            container.appendChild(card);
        });
        console.log("✅ Playlist rendering complete");
        console.log(`📦 Container now has ${container.children.length} children`);
    }

    createSpotifyPlaylistCard(playlist) {
        const card = document.createElement("div");
        card.className = "playlist-card-spotify";
        card.dataset.playlistId = playlist.id;

        const coverUrl =
            playlist.tracks && playlist.tracks.length > 0
                ? resolveMediaUrl(playlist.tracks[0].cover)
                : "";

        card.innerHTML = `
            ${
                coverUrl
                    ? `<img class="playlist-cover" src="${coverUrl}" alt="${this.escapeHtml(
                          playlist.name
                      )}" onerror="this.style.display='none'">`
                    : ""
            }
            <div class="playlist-overlay">
                <div class="playlist-info">
                    <div class="playlist-name">${this.escapeHtml(playlist.name)}</div>
                    <div class="playlist-details">${playlist.tracks ? playlist.tracks.length : 0} tracks</div>
                    <div class="playlist-actions">
                        <button class="playlist-action-btn play" title="Play playlist"><i class="fas fa-play"></i></button>
                        <button class="playlist-action-btn" title="View playlist"><i class="fas fa-list"></i></button>
                        <button class="playlist-action-btn" title="Download playlist"><i class="fas fa-download"></i></button>
                    </div>
                </div>
            </div>
        `;

        const playBtn = card.querySelector(".playlist-action-btn.play");
        const viewBtn = card.querySelector(".playlist-action-btn:nth-child(2)");
        const downloadBtn = card.querySelector(".playlist-action-btn:nth-child(3)");

        playBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.playPlaylist(playlist.id, playlist.name);
        });
        viewBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openFullscreen(playlist);
        });
        downloadBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.downloadPlaylist(playlist.id, playlist.name);
        });
        card.addEventListener("click", () => this.openFullscreen(playlist));

        console.log(`🎨 Created card for: ${playlist.name}`, {
            className: card.className,
            hasCover: !!coverUrl,
            trackCount: playlist.tracks?.length || 0
        });

        return card;
    }

    async openFullscreen(playlist) {
        this.currentPlaylist = playlist;
        this.currentPlaylistTracks = playlist.tracks || [];

        if (
            (!playlist.tracks || playlist.tracks.length === 0) &&
            this.playlistManager.loadPlaylistTracksForSpotify
        ) {
            playlist.tracks = await this.playlistManager.loadPlaylistTracksForSpotify(playlist.id);
            this.currentPlaylistTracks = playlist.tracks || [];
        }

        const coverImg = document.getElementById("fullscreenCover");
        if (coverImg) {
            coverImg.src =
                this.currentPlaylistTracks.length > 0
                    ? resolveMediaUrl(this.currentPlaylistTracks[0].cover)
                    : "";
            coverImg.alt = playlist.name;
        }

        const titleEl = document.getElementById("fullscreenTitle");
        if (titleEl) titleEl.textContent = playlist.name;

        const statsEl = document.getElementById("fullscreenStats");
        if (statsEl) {
            const n = this.currentPlaylistTracks.length;
            statsEl.textContent = `${n} track${n !== 1 ? "s" : ""}`;
        }

        this.renderFullscreenTracks(this.currentPlaylistTracks);

        const fullscreenEl = document.getElementById("playlistFullscreen");
        if (fullscreenEl) {
            fullscreenEl.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    }

    closeFullscreen() {
        const fullscreenEl = document.getElementById("playlistFullscreen");
        if (fullscreenEl) {
            fullscreenEl.classList.remove("active");
            document.body.style.overflow = "";
        }
    }

    renderFullscreenTracks(tracks) {
        const container = document.getElementById("fullscreenTracks");
        if (!container) return;

        if (!tracks || tracks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-music fa-3x text-muted mb-3"></i>
                    <h4 class="text-white">No Tracks in Playlist</h4>
                    <p class="text-muted">Add tracks from the main player.</p>
                    <button class="btn btn-primary mt-3" onclick="window.location.href='index.html'">
                        <i class="fas fa-arrow-left me-2"></i>Go to Player
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = tracks
            .map(
                (track, index) => `
            <div class="playlist-track" data-track-index="${index}">
                <div class="track-number">${index + 1}</div>
                <div class="track-info">
                    <div class="track-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="track-duration">${this.formatTime(track.duration) || "--:--"}</div>
                <div class="track-actions">
                    <button class="track-action-btn play-track" title="Play"><i class="fas fa-play"></i></button>
                    <button class="track-action-btn remove-track" title="Remove"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `
            )
            .join("");

        container.querySelectorAll(".play-track").forEach((btn, index) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.playTrackFromFullscreen(index);
            });
        });
        container.querySelectorAll(".remove-track").forEach((btn, index) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.removeTrackFromFullscreen(index);
            });
        });
        container.querySelectorAll(".playlist-track").forEach((el, index) => {
            el.addEventListener("click", () => this.playTrackFromFullscreen(index));
        });
    }

    playTrackFromFullscreen(index) {
        if (!this.currentPlaylistTracks?.length) {
            this.showNotification("No tracks available to play", "error");
            return;
        }
        const track = this.currentPlaylistTracks[index];
        if (!track) return;
        this.currentTrackIndex = index;
        this.loadTrack(track);
        this.playTrack();
        this.showNotification(`Now playing: ${track.title}`, "success");
        this.updateActiveTrackInFullscreen();
    }

    loadTrack(track) {
        if (!track?.file) {
            console.error("No track or file to load");
            return;
        }
        this.audioElement.pause();
        this.audioElement.src = resolveMediaUrl(track.file);
        this.updatePlayerUI(track);
        this.audioElement.load();
    }

    updatePlayerUI(track) {
        const miniCover = document.getElementById("miniCover");
        const songTitle = document.getElementById("songTitleInner");
        const songArtist = document.getElementById("songArtist");
        if (miniCover) miniCover.src = resolveMediaUrl(track.cover || "");
        if (songTitle) songTitle.textContent = track.title || "";
        if (songArtist) songArtist.textContent = track.artist || "";

        const bigCover = document.getElementById("bigPlayerCover");
        const bigTitle = document.getElementById("bigPlayerTitle");
        const bigArtist = document.getElementById("bigPlayerArtist");
        if (bigCover) bigCover.src = resolveMediaUrl(track.cover || "");
        if (bigTitle) bigTitle.textContent = track.title || "";
        if (bigArtist) bigArtist.textContent = track.artist || "";
    }

    async playTrack() {
        try {
            await this.audioElement.play();
            this.isPlaying = true;
            this.updatePlayButton();
        } catch (error) {
            console.error("Error playing track:", error);
            this.showNotification("Error playing track", "error");
        }
    }

    pauseTrack() {
        this.audioElement.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    togglePlayPause() {
        this.isPlaying ? this.pauseTrack() : this.playTrack();
    }

    updatePlayButton() {
        const icon = this.isPlaying ? "⏸" : "▶";
        const playBtn = document.getElementById("play");
        const bigPlayBtn = document.getElementById("bigPlay");
        if (playBtn) playBtn.textContent = icon;
        if (bigPlayBtn) bigPlayBtn.textContent = icon;
    }

    playNextTrack() {
        if (!this.currentPlaylistTracks?.length) return;
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentPlaylistTracks.length;
        this.loadTrack(this.currentPlaylistTracks[this.currentTrackIndex]);
        this.playTrack();
        this.updateActiveTrackInFullscreen();
    }

    playPreviousTrack() {
        if (!this.currentPlaylistTracks?.length) return;
        this.currentTrackIndex =
            this.currentTrackIndex > 0
                ? this.currentTrackIndex - 1
                : this.currentPlaylistTracks.length - 1;
        this.loadTrack(this.currentPlaylistTracks[this.currentTrackIndex]);
        this.playTrack();
        this.updateActiveTrackInFullscreen();
    }

    updateActiveTrackInFullscreen() {
        document.querySelectorAll(".playlist-track").forEach((el, i) => {
            el.classList.toggle("active", i === this.currentTrackIndex);
        });
    }

    setVolume(volume) {
        this.audioElement.volume = volume;
        const volumeSlider = document.getElementById("volumeSlider");
        const bigVolumeSlider = document.getElementById("bigVolumeSlider");
        if (volumeSlider) volumeSlider.value = volume * 100;
        if (bigVolumeSlider) bigVolumeSlider.value = volume * 100;
    }

    seekTrack(e) {
        if (!this.audioElement.duration) return;
        const bar = e.currentTarget;
        const pct = e.offsetX / bar.clientWidth;
        this.audioElement.currentTime = pct * this.audioElement.duration;
    }

    updateProgress() {
        const currentTime = this.audioElement.currentTime;
        const duration = this.audioElement.duration;
        const pct = (currentTime / duration) * 100 || 0;

        ["curTime", "bigCurTime"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.formatTime(currentTime);
        });
        ["durTime", "bigDurTime"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.formatTime(duration);
        });

        const progressBar = document.getElementById("progressBar");
        const thumb = document.getElementById("thumb");
        const bigProgressBar = document.getElementById("bigProgressBar");
        const bigThumb = document.getElementById("bigThumb");
        if (progressBar) progressBar.style.width = pct + "%";
        if (thumb) thumb.style.left = pct + "%";
        if (bigProgressBar) bigProgressBar.style.width = pct + "%";
        if (bigThumb) bigThumb.style.left = pct + "%";
    }

    updateDurationDisplay() {
        const duration = this.audioElement.duration;
        const durTime = document.getElementById("durTime");
        const bigDurTime = document.getElementById("bigDurTime");
        if (durTime) durTime.textContent = this.formatTime(duration);
        if (bigDurTime) bigDurTime.textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60)
            .toString()
            .padStart(2, "0");
        return `${m}:${s}`;
    }

    async removeTrackFromFullscreen(index) {
        if (!this.currentPlaylist || !this.playlistManager) return;

        try {
            this.currentPlaylist.tracks.splice(index, 1);
            this.currentPlaylistTracks = this.currentPlaylist.tracks;

            if (this.playlistManager.db && this.playlistManager.currentUser) {
                await this.playlistManager.db
                    .collection("users")
                    .doc(this.playlistManager.currentUser.uid)
                    .collection("playlists")
                    .doc(this.currentPlaylist.id)
                    .update({ tracks: this.currentPlaylist.tracks, updatedAt: new Date() });
            }

            this.renderFullscreenTracks(this.currentPlaylist.tracks);
            const statsEl = document.getElementById("fullscreenStats");
            if (statsEl) {
                const n = this.currentPlaylist.tracks.length;
                statsEl.textContent = `${n} track${n !== 1 ? "s" : ""}`;
            }

            if (this.playlistManager.loadPlaylists) {
                await this.playlistManager.loadPlaylists();
            }
            this.renderSpotifyPlaylists();
            window.dispatchEvent(new Event("playlistsUpdated"));
            this.showNotification("Track removed from playlist", "success");
        } catch (error) {
            console.error(error);
            this.showNotification("Error removing track", "error");
        }
    }

    playPlaylist(playlistId, playlistName) {
        const playlist = this.getPlaylistsArray().find((p) => p.id === playlistId);
        if (!playlist) {
            this.showNotification("Playlist not found", "error");
            return;
        }
        this.currentPlaylist = playlist;
        this.currentPlaylistTracks = playlist.tracks || [];
        if (!this.currentPlaylistTracks.length) {
            this.showNotification("No tracks in this playlist", "error");
            return;
        }
        this.currentTrackIndex = 0;
        this.loadTrack(this.currentPlaylistTracks[0]);
        this.playTrack();
        this.showNotification(`Now playing: ${playlistName}`, "success");
    }

    playFullscreenPlaylist() {
        if (!this.currentPlaylistTracks?.length) {
            this.showNotification("No tracks to play", "error");
            return;
        }
        this.currentTrackIndex = 0;
        this.loadTrack(this.currentPlaylistTracks[0]);
        this.playTrack();
        this.updateActiveTrackInFullscreen();
        this.showNotification(`Now playing: ${this.currentPlaylist.name}`, "success");
    }

    downloadSingle(track) {
        const a = document.createElement("a");
        a.href = resolveMediaUrl(track.file);
        a.download = track.file.split("/").pop() || `${track.title}.opus`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    downloadPlaylist(playlistId, playlistName) {
        const playlist = this.getPlaylistsArray().find((p) => p.id === playlistId);
        if (!playlist?.tracks?.length) {
            this.showNotification("No tracks to download", "error");
            return;
        }
        if (window.downloadPlaylist) {
            window.downloadPlaylist(playlist.tracks);
        } else {
            playlist.tracks.forEach((t, i) => setTimeout(() => this.downloadSingle(t), i * 500));
        }
        this.showNotification(`Downloading playlist: ${playlistName}`, "success");
    }

    downloadFullscreenPlaylist() {
        if (!this.currentPlaylistTracks?.length) {
            this.showNotification("No tracks to download", "error");
            return;
        }
        if (window.downloadPlaylist) {
            window.downloadPlaylist(this.currentPlaylistTracks);
        } else {
            this.currentPlaylistTracks.forEach((t, i) =>
                setTimeout(() => this.downloadSingle(t), i * 500)
            );
        }
        this.showNotification(`Downloading playlist: ${this.currentPlaylist.name}`, "success");
    }

    async renameFullscreenPlaylist() {
        if (!this.currentPlaylist) return;
        const newName = prompt("Enter new playlist name:", this.currentPlaylist.name);
        if (!newName?.trim() || newName.trim() === this.currentPlaylist.name) return;

        try {
            if (this.playlistManager.renamePlaylist) {
                await this.playlistManager.renamePlaylist(this.currentPlaylist.id, newName.trim());
                this.showNotification("Playlist renamed successfully", "success");
                this.closeFullscreen();
                if (this.playlistManager.loadPlaylists) await this.playlistManager.loadPlaylists();
                this.renderSpotifyPlaylists();
                window.dispatchEvent(new Event("playlistsUpdated"));
            } else {
                this.showNotification("Rename not available", "error");
            }
        } catch (e) {
            this.showNotification("Error renaming playlist", "error");
        }
    }

    async deleteFullscreenPlaylist() {
        if (!this.currentPlaylist) return;
        if (!confirm("Delete this playlist? This cannot be undone.")) return;

        try {
            if (this.playlistManager.db && this.playlistManager.currentUser) {
                await this.playlistManager.db
                    .collection("users")
                    .doc(this.playlistManager.currentUser.uid)
                    .collection("playlists")
                    .doc(this.currentPlaylist.id)
                    .delete();

                const arr = this.getPlaylistsArray();
                const idx = arr.findIndex((p) => p.id === this.currentPlaylist.id);
                if (idx !== -1) arr.splice(idx, 1);

                this.showNotification("Playlist deleted successfully", "success");
                this.closeFullscreen();
                this.renderSpotifyPlaylists();
                window.dispatchEvent(new Event("playlistsUpdated"));
            } else if (this.playlistManager.deletePlaylist) {
                await this.playlistManager.deletePlaylist(this.currentPlaylist.id);
                this.showNotification("Playlist deleted successfully", "success");
                this.closeFullscreen();
                if (this.playlistManager.loadPlaylists) await this.playlistManager.loadPlaylists();
                this.renderSpotifyPlaylists();
            } else {
                this.showNotification("Delete not available", "error");
            }
        } catch (e) {
            console.error(e);
            this.showNotification("Error deleting playlist", "error");
        }
    }

    showCreatePlaylistModal() {
        const modalEl = document.getElementById("createPlaylistModal");
        if (!modalEl) {
            alert("Create playlist modal not found in HTML");
            return;
        }
        const modal = new bootstrap.Modal(modalEl);
        const input = document.getElementById("newPlaylistNameModal");
        if (input) input.value = "";

        const createBtn = document.getElementById("createPlaylistModalBtn");
        if (createBtn) {
            createBtn.replaceWith(createBtn.cloneNode(true));
            document.getElementById("createPlaylistModalBtn").addEventListener("click", () => {
                this.createPlaylistFromModal();
            });
        }
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === "Enter") this.createPlaylistFromModal();
            };
        }
        modal.show();
        setTimeout(() => input?.focus(), 400);
    }

    async createPlaylistFromModal() {
        const modalInput = document.getElementById("newPlaylistNameModal");
        const name = modalInput?.value.trim();
        if (!name) {
            alert("Please enter a playlist name");
            return;
        }
        if (name.length > 50) {
            alert("Playlist name must be 50 characters or less");
            return;
        }
        if (!this.isUserAuthenticated()) {
            alert("Please log in to create playlists");
            return;
        }
        if (this.getPlaylistsArray().some((p) => p.name.toLowerCase() === name.toLowerCase())) {
            alert("A playlist with this name already exists");
            return;
        }

        try {
            const playlist = {
                name,
                tracks: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.playlistManager.db
                .collection("users")
                .doc(this.playlistManager.currentUser.uid)
                .collection("playlists")
                .add(playlist);

            bootstrap.Modal.getInstance(document.getElementById("createPlaylistModal"))?.hide();
            if (modalInput) modalInput.value = "";

            setTimeout(async () => {
                if (this.playlistManager.loadPlaylists) await this.playlistManager.loadPlaylists();
                this.renderSpotifyPlaylists();
                window.dispatchEvent(new Event("playlistsUpdated"));
            }, 800);

            this.showNotification("Playlist created successfully!", "success");
        } catch (error) {
            console.error(error);
            this.showNotification("Error creating playlist: " + error.message, "error");
        }
    }

    isUserAuthenticated() {
        return !!(this.playlistManager && (this.playlistManager.currentUser || this.playlistManager.user));
    }

    showNotification(message, type) {
        document.querySelector(".playlist-notification")?.remove();
        const el = document.createElement("div");
        el.className = `playlist-notification playlist-notification-${type}`;
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    escapeHtml(unsafe) {
        if (unsafe == null) return "";
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

let spotifyEnhancer;
document.addEventListener("DOMContentLoaded", () => {
    console.log("🏁 DOM loaded, starting Spotify enhancer...");
    try {
        spotifyEnhancer = new SpotifyPlaylistEnhancer();
        window.spotifyEnhancer = spotifyEnhancer;
        console.log("✅ Spotify enhancer initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing Spotify enhancer:", error);
    }
});