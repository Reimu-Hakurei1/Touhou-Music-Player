/* ============================================================
   playlist-spotify-new.js — polished Spotify-style playlist UI
   ============================================================ */

// ---------- R2 base URL ----------
if (typeof R2_BASE === "undefined") {
  window.R2_BASE = "https://pub-ce8938dd87f442ef8827efc2a61b6976.r2.dev/";
}
if (typeof window.resolveMediaUrl !== "function") {
  window.resolveMediaUrl = function (path) {
    if (!path) return "";
    if (/^(https?:|blob:|data:)/i.test(path)) return path;
    return window.R2_BASE.replace(/\/$/, "") + "/" +
      String(path).replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  };
}

console.log("🚀 playlist-spotify-new.js loaded");

class SpotifyPlaylistEnhancer {
  constructor() {
    this.playlistManager = null;
    this.currentPlaylist = null;
    this.currentPlaylistTracks = [];
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.audioElement = null;
    this._pollTimer = null;
    this.init();
  }

  async init() {
    console.log("🎵 Spotify Playlist Enhancer initializing…");
    try {
      await this.waitForPlaylistManager();
      if (!this.playlistManager) {
        console.error("❌ No playlist manager found");
        this.renderFallback("Playlist manager not found. Check that playlist-manager.js is loaded.");
        return;
      }

      this.setupEventListeners();
      this.initializeAudioElement();
      this.listenForPlaylistUpdates();

      await this.tryLoadPlaylists();
      this.renderPlaylists();
      this.startPolling();

      console.log("✅ Spotify Playlist Enhancer ready");
    } catch (err) {
      console.error("❌ Init error:", err);
      this.renderFallback("Init error: " + (err.message || err));
    }
  }

  // ---------- waiting for playlist manager ----------
  async waitForPlaylistManager() {
    const max = 40;         // ~20s
    for (let i = 0; i < max; i++) {
      const mgr = window.playlistManagerFixed || window.playlistManager || window.PlaylistManagerInstance;
      if (mgr) {
        this.playlistManager = mgr;
        console.log("✅ Playlist manager found");
        return;
      }
      if (i % 4 === 0) console.log(`⏳ Waiting for playlist manager (${i + 1}/${max})`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  async tryLoadPlaylists() {
    if (!this.playlistManager) return;
    try {
      if (typeof this.playlistManager.loadPlaylists === "function") {
        console.log("🔄 Loading playlists…");
        await this.playlistManager.loadPlaylists();
      }
    } catch (e) {
      console.warn("loadPlaylists failed (may be normal if not logged in):", e);
    }
  }

  async refreshPlaylists() {
    await this.tryLoadPlaylists();
    this.renderPlaylists();
  }

  // ---------- events ----------
  setupEventListeners() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    };

    // Fullscreen controls
    bind("closeFullscreen", () => this.closeFullscreen());
    bind("playFullscreenPlaylist", () => this.playFullscreen());
    bind("downloadFullscreenPlaylist", () => this.downloadFullscreenPlaylist());
    bind("renameFullscreenPlaylist", () => this.renameFullscreenPlaylist());
    bind("deleteFullscreenPlaylist", () => this.deleteFullscreenPlaylist());

    // Player bar controls (so the page is self-contained)
    if (window.playPlaylistTrackAt) return this.setupPlaylistViewOnlyEvents(bind);
    bind("play", () => this.togglePlayPause());
    bind("prev", () => this.playPrevious());
    bind("next", () => this.playNext());
    bind("bigPlay", () => this.togglePlayPause());
    bind("bigPrev", () => this.playPrevious());
    bind("bigNext", () => this.playNext());

    const vol = document.getElementById("volumeSlider");
    if (vol) vol.addEventListener("input", (e) => this.setVolume(e.target.value / 100));
    const bvol = document.getElementById("bigVolumeSlider");
    if (bvol) bvol.addEventListener("input", (e) => this.setVolume(e.target.value / 100));

    const prog = document.getElementById("progress");
    if (prog) prog.addEventListener("click", (e) => this.seek(e, prog));
    const bprog = document.getElementById("bigProgress");
    if (bprog) bprog.addEventListener("click", (e) => this.seek(e, bprog));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeFullscreen();
    });
  }

  setupPlaylistViewOnlyEvents(bind) {
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.closeFullscreen(); });
  }

  listenForPlaylistUpdates() {
    window.addEventListener("playlistsUpdated", () => this.renderPlaylists());
  }

  startPolling() {
    let n = 0;
    const tick = () => {
      n++;
      if (n > 60) return;
      const count = this.getPlaylists().length;
      if (count > 0) {
        this.renderPlaylists();
        this._pollTimer = setTimeout(tick, 4000);
        return;
      }
      this._pollTimer = setTimeout(tick, 600);
    };
    this._pollTimer = setTimeout(tick, 600);
  }

  // ---------- audio ----------
  initializeAudioElement() {
    this.audioElement = document.getElementById("audioEl") || new Audio();
    this.audioElement.preload = "metadata";
    // index.html owns playback on the combined library page; attaching another
    // ended handler here would skip every other playlist track.
    if (window.playPlaylistTrackAt) return;
    this.audioElement.addEventListener("loadedmetadata", () => this.updateDuration());
    this.audioElement.addEventListener("timeupdate", () => this.updateProgress());
    this.audioElement.addEventListener("ended", () => this.playNext());
    this.audioElement.addEventListener("error", () => {
      this.showNotification("Error playing track", "error");
    });
  }

  // ---------- data helpers ----------
  getPlaylists() {
    const m = this.playlistManager;
    if (!m) return [];
    if (Array.isArray(m.playlists)) return m.playlists;
    if (Array.isArray(m.userPlaylists)) return m.userPlaylists;
    return [];
  }

  isAuthed() {
    const m = this.playlistManager;
    return !!(m && (m.currentUser || m.user));
  }

  // ---------- rendering ----------
  renderPlaylists() {
    const container = document.getElementById("playlistsGrid");
    if (!container) return;

    // Not logged in
    if (!this.isAuthed()) {
      container.innerHTML = `
        <div class="empty-state-container">
          <div class="empty-state-content">
            <i class="fas fa-user-lock fa-3x text-muted mb-2"></i>
            <h4>Please log in</h4>
            <p>Sign in to see and create playlists.</p>
          </div>
        </div>`;
      return;
    }

    const playlists = this.getPlaylists();
    container.innerHTML = "";

    // Create card first
    const createCard = document.createElement("div");
    createCard.className = "create-playlist-card";
    createCard.tabIndex = 0;
    createCard.setAttribute("role", "button");
    createCard.setAttribute("aria-label", "Create new playlist");
    createCard.innerHTML = `
      <div class="create-playlist-icon"><i class="fas fa-plus"></i></div>
      <div class="create-playlist-text">Create Playlist</div>`;
    createCard.addEventListener("click", () => this.showCreatePlaylistModal());
    createCard.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.showCreatePlaylistModal();
      }
    });
    container.appendChild(createCard);

    // Empty state
    if (playlists.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state-container";
      empty.innerHTML = `
        <div class="empty-state-content">
          <i class="fas fa-music fa-3x text-muted mb-2"></i>
          <h4>No playlists yet</h4>
          <p>Create your first playlist to get started.</p>
        </div>`;
      container.appendChild(empty);
      return;
    }

    // Playlist cards
    playlists.forEach((pl) => container.appendChild(this.createCard(pl)));
  }

  createCard(playlist) {
    const card = document.createElement("div");
    card.className = "playlist-card-spotify";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${playlist.name} — ${playlist.tracks?.length || 0} tracks`);
    card.dataset.playlistId = playlist.id;

    const cover = playlist.tracks?.[0]?.cover
      ? window.resolveMediaUrl(playlist.tracks[0].cover)
      : "";

    card.innerHTML = `
      ${cover ? `<img class="playlist-cover" src="${cover}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
      <div class="playlist-overlay">
        <div class="playlist-info">
          <div class="playlist-name">${this.escape(playlist.name)}</div>
          <div class="playlist-details">${playlist.tracks?.length || 0} track${playlist.tracks?.length === 1 ? "" : "s"}</div>
          <div class="playlist-actions">
            <button class="playlist-action-btn play" title="Play" aria-label="Play playlist">
              <i class="fas fa-play"></i>
            </button>
            <button class="playlist-action-btn view" title="View" aria-label="View playlist">
              <i class="fas fa-list"></i>
            </button>
            <button class="playlist-action-btn dl" title="Download" aria-label="Download playlist">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </div>
      </div>`;

    card.querySelector(".playlist-action-btn.play").addEventListener("click", (e) => {
      e.stopPropagation();
      this.playPlaylist(playlist);
    });
    card.querySelector(".playlist-action-btn.view").addEventListener("click", (e) => {
      e.stopPropagation();
      this.openFullscreen(playlist);
    });
    card.querySelector(".playlist-action-btn.dl").addEventListener("click", (e) => {
      e.stopPropagation();
      this.downloadPlaylist(playlist);
    });
    card.addEventListener("click", () => this.openFullscreen(playlist));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.openFullscreen(playlist);
      }
    });

    return card;
  }

  renderFallback(message) {
    const container = document.getElementById("playlistsGrid");
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state-container">
        <div class="empty-state-content">
          <i class="fas fa-exclamation-triangle fa-3x mb-2" style="color:#f0b429"></i>
          <h4>Playlists unavailable</h4>
          <p>${this.escape(message)}</p>
          <button class="btn-ghost mt-3" onclick="location.reload()">
            <i class="fas fa-rotate"></i> Reload
          </button>
        </div>
      </div>`;
  }

  // ---------- fullscreen ----------
  async openFullscreen(playlist) {
    this.currentPlaylist = playlist;

    // Lazily load tracks if needed
    if ((!playlist.tracks || playlist.tracks.length === 0) &&
        this.playlistManager?.loadPlaylistTracksForSpotify) {
      try {
        playlist.tracks = await this.playlistManager.loadPlaylistTracksForSpotify(playlist.id);
      } catch (_) { playlist.tracks = []; }
    }
    this.currentPlaylistTracks = playlist.tracks || [];

    // Cover
    const cover = document.getElementById("fullscreenCover");
    if (cover) {
      cover.src = this.currentPlaylistTracks[0]?.cover
        ? window.resolveMediaUrl(this.currentPlaylistTracks[0].cover)
        : "";
      cover.alt = playlist.name;
    }

    // Title + stats
    const title = document.getElementById("fullscreenTitle");
    if (title) title.textContent = playlist.name;
    const stats = document.getElementById("fullscreenStats");
    if (stats) {
      const n = this.currentPlaylistTracks.length;
      stats.textContent = `${n} track${n === 1 ? "" : "s"}`;
    }

    this.renderFullscreenTracks(this.currentPlaylistTracks);
    this.fillMissingDurations(playlist, this.currentPlaylistTracks);

    const fs = document.getElementById("playlistFullscreen");
    if (fs) {
      fs.classList.add("active");
      fs.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }

  closeFullscreen() {
    const fs = document.getElementById("playlistFullscreen");
    if (fs) {
      fs.classList.remove("active");
      fs.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  renderFullscreenTracks(tracks) {
    const container = document.getElementById("fullscreenTracks");
    if (!container) return;

    if (!tracks || tracks.length === 0) {
      container.innerHTML = `
        <div class="empty-state-content" style="margin: 40px auto;">
          <i class="fas fa-music fa-3x text-muted mb-2"></i>
          <h4>No tracks yet</h4>
          <p>Add tracks from the main player.</p>
        </div>`;
      return;
    }

    container.innerHTML = tracks.map((t, i) => `
      <div class="playlist-track" data-index="${i}">
        <div class="track-number">${i + 1}</div>
        <div class="track-info">
          <div class="track-title">${this.escape(t.title)}</div>
          <div class="track-artist">${this.escape(t.artist)}</div>
        </div>
        <div class="track-duration">${this.formatTime(t.duration) || "--:--"}</div>
        <div class="track-actions">
          <button class="track-action-btn play-track" title="Play" aria-label="Play">
            <i class="fas fa-play"></i>
          </button>
          <button class="track-action-btn remove-track" title="Remove" aria-label="Remove from playlist">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".play-track").forEach((btn, i) =>
      btn.addEventListener("click", (e) => { e.stopPropagation(); this.playTrackFromFullscreen(i); })
    );
    container.querySelectorAll(".remove-track").forEach((btn, i) =>
      btn.addEventListener("click", (e) => { e.stopPropagation(); this.removeTrackFromFullscreen(i); })
    );
    container.querySelectorAll(".playlist-track").forEach((el, i) =>
      el.addEventListener("click", () => this.playTrackFromFullscreen(i))
    );

    this.markActive();
  }

  fillMissingDurations(playlist, tracks) {
    if (!window.TrackMedia?.getDuration) return;
    tracks.forEach(async (track, index) => {
      let duration = window.TrackMedia.known?.(track) || Number(track.duration) || 0;
      if (!duration) duration = await window.TrackMedia.getDuration(track, 5000);
      if (!duration || this.currentPlaylist?.id !== playlist.id) return;
      track.duration = duration;
      const cell = document.querySelector(`#fullscreenTracks .playlist-track[data-index="${index}"] .track-duration`);
      if (cell) cell.textContent = this.formatTime(duration);
    });
  }

  markActive() {
    document.querySelectorAll(".playlist-track").forEach((el, i) =>
      el.classList.toggle("active", i === this.currentTrackIndex)
    );
  }

  // ---------- playback ----------
  playPlaylist(playlist) {
    if (!playlist?.tracks?.length) {
      this.showNotification("No tracks in this playlist", "error");
      return;
    }
    if (window.loadPlaylist) {
      window.loadPlaylist(playlist.id, playlist.name);
      this.currentPlaylist = playlist;
      this.currentPlaylistTracks = playlist.tracks;
      this.currentTrackIndex = 0;
      return;
    }
    this.currentPlaylist = playlist;
    this.currentPlaylistTracks = playlist.tracks;
    this.currentTrackIndex = 0;
    this.loadTrack(this.currentPlaylistTracks[0]);
    this.play();
    this.showNotification(`Now playing: ${playlist.name}`, "success");
  }

  playFullscreen() {
    if (!this.currentPlaylistTracks?.length) {
      this.showNotification("No tracks to play", "error");
      return;
    }
    if (window.loadPlaylist && this.currentPlaylist?.id) {
      window.loadPlaylist(this.currentPlaylist.id, this.currentPlaylist.name);
      this.currentTrackIndex = 0;
      return;
    }
    this.currentTrackIndex = 0;
    this.loadTrack(this.currentPlaylistTracks[0]);
    this.play();
    this.markActive();
  }

  playTrackFromFullscreen(i) {
    if (!this.currentPlaylistTracks?.[i]) return;
    this.currentTrackIndex = i;
    if (window.playPlaylistTrackAt) {
      window.playPlaylistTrackAt(i);
      this.markActive();
      return;
    }
    this.loadTrack(this.currentPlaylistTracks[i]);
    this.play();
    this.markActive();
    this.showNotification(`Now playing: ${this.currentPlaylistTracks[i].title}`, "success");
  }

  loadTrack(track) {
    if (!track?.file) return;
    this.audioElement.pause();
    this.audioElement.src = window.resolveMediaUrl(track.file);
    this.updatePlayerUI(track);
    this.audioElement.load();
  }

  play() {
    this.audioElement.play().then(() => {
      this.isPlaying = true;
      this.updatePlayButton();
    }).catch((err) => {
      console.error("Playback error:", err);
      this.showNotification("Couldn't play this track", "error");
    });
  }
  pause() { this.audioElement.pause(); this.isPlaying = false; this.updatePlayButton(); }
  togglePlayPause() { this.isPlaying ? this.pause() : this.play(); }

  playNext() {
    if (!this.currentPlaylistTracks?.length) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentPlaylistTracks.length;
    this.loadTrack(this.currentPlaylistTracks[this.currentTrackIndex]);
    this.play();
    this.markActive();
  }
  playPrevious() {
    if (!this.currentPlaylistTracks?.length) return;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.currentPlaylistTracks.length) % this.currentPlaylistTracks.length;
    this.loadTrack(this.currentPlaylistTracks[this.currentTrackIndex]);
    this.play();
    this.markActive();
  }

  updatePlayButton() {
    const icon = this.isPlaying ? "❚❚" : "▶";
    const a = document.getElementById("play");
    const b = document.getElementById("bigPlay");
    if (a) a.textContent = icon;
    if (b) b.textContent = icon;
  }

  updatePlayerUI(track) {
    const pairs = [
      ["miniCover", window.resolveMediaUrl(track.cover || "")],
      ["bigPlayerCover", window.resolveMediaUrl(track.cover || "")],
    ];
    pairs.forEach(([id, src]) => {
      const el = document.getElementById(id);
      if (el) el.src = src;
    });
    const t1 = document.getElementById("songTitleInner");
    const t2 = document.getElementById("bigPlayerTitle");
    if (t1) t1.textContent = track.title || "";
    if (t2) t2.textContent = track.title || "";
    const a1 = document.getElementById("songArtist");
    const a2 = document.getElementById("bigPlayerArtist");
    if (a1) a1.textContent = track.artist || "";
    if (a2) a2.textContent = track.artist || "";
  }

  setVolume(v) {
    this.audioElement.volume = v;
    const a = document.getElementById("volumeSlider");
    const b = document.getElementById("bigVolumeSlider");
    if (a) a.value = v * 100;
    if (b) b.value = v * 100;
  }

  seek(e, bar) {
    if (!this.audioElement.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    this.audioElement.currentTime = pct * this.audioElement.duration;
  }

  updateProgress() {
    const cur = this.audioElement.currentTime;
    const dur = this.audioElement.duration;
    const pct = (cur / dur) * 100 || 0;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("curTime", this.formatTime(cur));
    set("bigCurTime", this.formatTime(cur));
    set("durTime", this.formatTime(dur));
    set("bigDurTime", this.formatTime(dur));
    const bars = [
      ["progressBar", "width", pct + "%"],
      ["bigProgressBar", "width", pct + "%"],
      ["thumb", "left", pct + "%"],
      ["bigThumb", "left", pct + "%"],
    ];
    bars.forEach(([id, prop, val]) => {
      const el = document.getElementById(id);
      if (el) el.style[prop] = val;
    });
  }

  updateDuration() {
    const dur = this.audioElement.duration;
    const a = document.getElementById("durTime");
    const b = document.getElementById("bigDurTime");
    if (a) a.textContent = this.formatTime(dur);
    if (b) b.textContent = this.formatTime(dur);
  }

  // ---------- playlist actions ----------
  async removeTrackFromFullscreen(i) {
    if (!this.currentPlaylist || !this.playlistManager) return;
    const tracks = this.currentPlaylist.tracks || [];
    tracks.splice(i, 1);
    this.currentPlaylistTracks = tracks;

    try {
      if (this.playlistManager.db && this.playlistManager.currentUser) {
        await this.playlistManager.db
          .collection("users").doc(this.playlistManager.currentUser.uid)
          .collection("playlists").doc(this.currentPlaylist.id)
          .update({ tracks, updatedAt: new Date() });
      }
      this.renderFullscreenTracks(tracks);
      const stats = document.getElementById("fullscreenStats");
      if (stats) {
        const n = tracks.length;
        stats.textContent = `${n} track${n === 1 ? "" : "s"}`;
      }
      if (this.playlistManager.loadPlaylists) await this.playlistManager.loadPlaylists();
      window.dispatchEvent(new Event("playlistsUpdated"));
      this.showNotification("Track removed", "success");
    } catch (err) {
      console.error(err);
      this.showNotification("Could not remove track", "error");
    }
  }

  downloadPlaylist(playlist) {
    if (!playlist?.tracks?.length) {
      this.showNotification("No tracks to download", "error");
      return;
    }
    if (window.TrackMedia?.download) {
      window.TrackMedia.download(playlist.tracks, { asZip: true, name: playlist.name });
      return;
    }
    // Fallback: individual downloads
    playlist.tracks.forEach((t, i) => setTimeout(() => this.downloadSingle(t), i * 400));
    this.showNotification(`Downloading ${playlist.tracks.length} tracks`, "success");
  }

  downloadFullscreenPlaylist() {
    if (!this.currentPlaylist) return;
    this.downloadPlaylist(this.currentPlaylist);
  }

  downloadSingle(track) {
    const a = document.createElement("a");
    a.href = window.resolveMediaUrl(track.file);
    a.download = track.file.split("/").pop() || `${track.title}.opus`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async renameFullscreenPlaylist() {
    if (!this.currentPlaylist) return;
    const name = prompt("New playlist name:", this.currentPlaylist.name)?.trim();
    if (!name || name === this.currentPlaylist.name) return;
    if (name.length > 50) return this.showNotification("Name must be 50 characters or less", "error");

    try {
      if (this.playlistManager.db && this.playlistManager.currentUser) {
        await this.playlistManager.db
          .collection("users").doc(this.playlistManager.currentUser.uid)
          .collection("playlists").doc(this.currentPlaylist.id)
          .update({ name, updatedAt: new Date() });
      }
      this.currentPlaylist.name = name;
      const title = document.getElementById("fullscreenTitle");
      if (title) title.textContent = name;
      if (this.playlistManager.loadPlaylists) await this.playlistManager.loadPlaylists();
      window.dispatchEvent(new Event("playlistsUpdated"));
      this.showNotification("Playlist renamed", "success");
    } catch (err) {
      console.error(err);
      this.showNotification("Could not rename playlist", "error");
    }
  }

  async deleteFullscreenPlaylist() {
    if (!this.currentPlaylist) return;
    if (!confirm("Delete this playlist? This cannot be undone.")) return;

    try {
      if (this.playlistManager.db && this.playlistManager.currentUser) {
        await this.playlistManager.db
          .collection("users").doc(this.playlistManager.currentUser.uid)
          .collection("playlists").doc(this.currentPlaylist.id)
          .delete();
      }
      const arr = this.getPlaylists();
      const idx = arr.findIndex((p) => p.id === this.currentPlaylist.id);
      if (idx !== -1) arr.splice(idx, 1);

      this.closeFullscreen();
      if (this.playlistManager.loadPlaylists) await this.playlistManager.loadPlaylists();
      window.dispatchEvent(new Event("playlistsUpdated"));
      this.showNotification("Playlist deleted", "success");
    } catch (err) {
      console.error(err);
      this.showNotification("Could not delete playlist", "error");
    }
  }

  // ---------- create playlist ----------
  showCreatePlaylistModal() {
    const modalEl = document.getElementById("createPlaylistModal");
    if (!modalEl) return alert("Create playlist modal not found");
    const modal = new bootstrap.Modal(modalEl);
    const input = document.getElementById("newPlaylistNameModal");
    if (input) input.value = "";

    const btn = document.getElementById("createPlaylistModalBtn");
    if (btn) {
      btn.replaceWith(btn.cloneNode(true));
      document.getElementById("createPlaylistModalBtn").addEventListener("click", () => this.createPlaylistFromModal());
    }
    if (input) {
      input.onkeypress = (e) => { if (e.key === "Enter") this.createPlaylistFromModal(); };
    }
    modal.show();
    setTimeout(() => input?.focus(), 350);
  }

  async createPlaylistFromModal() {
    const input = document.getElementById("newPlaylistNameModal");
    const name = input?.value.trim();
    if (!name) return alert("Please enter a playlist name");
    if (name.length > 50) return alert("Playlist name must be 50 characters or less");
    if (!this.isAuthed()) return alert("Please log in to create playlists");
    if (this.getPlaylists().some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return alert("A playlist with this name already exists");
    }

    try {
      await this.playlistManager.db
        .collection("users").doc(this.playlistManager.currentUser.uid)
        .collection("playlists")
        .add({ name, tracks: [], createdAt: new Date(), updatedAt: new Date() });

      bootstrap.Modal.getInstance(document.getElementById("createPlaylistModal"))?.hide();
      if (input) input.value = "";

      if (this.playlistManager.loadPlaylists) await this.playlistManager.loadPlaylists();
      window.dispatchEvent(new Event("playlistsUpdated"));
      this.showNotification("Playlist created", "success");
    } catch (err) {
      console.error(err);
      this.showNotification("Could not create playlist", "error");
    }
  }

  // ---------- utilities ----------
  showNotification(message, type) {
    document.querySelector(".playlist-notification")?.remove();
    const el = document.createElement("div");
    el.className = `playlist-notification playlist-notification-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  escape(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

let spotifyEnhancer;
document.addEventListener("DOMContentLoaded", () => {
  console.log("🏁 DOM ready, starting Spotify enhancer…");
  try {
    spotifyEnhancer = new SpotifyPlaylistEnhancer();
    window.spotifyEnhancer = spotifyEnhancer;
    console.log("✅ Spotify enhancer initialized");
  } catch (err) {
    console.error("❌ Initialization error:", err);
  }
});
