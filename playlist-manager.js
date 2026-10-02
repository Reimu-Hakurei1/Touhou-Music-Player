/* ============================================================
   playlist-manager.js — Firestore-backed playlist manager
   ============================================================ */

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
      const check = () => {
        if (window.firebaseReady && window.firebaseAuth) {
          this.db = window.firebaseDb;
          resolve();
        } else setTimeout(check, 100);
      };
      check();
    });
  }

  setupAuthListener() {
    if (!window.firebaseAuth) return;

    window.firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = user;
        this.initialized = true;
        console.log("PlaylistManager: signed in as", user.email);
        this.loadPlaylists();
      } else {
        this.currentUser = null;
        this.initialized = true;
        console.log("PlaylistManager: signed out");
      }
    });

    const u = window.firebaseAuth.currentUser;
    if (u && !this.currentUser) {
      this.currentUser = u;
      this.initialized = true;
      this.loadPlaylists();
    }
  }

  setupEventListeners() {
    // These listeners are optional — the page may not contain them.
    const bind = (id, fn, evt = "click") => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(evt, fn);
    };

    bind("createPlaylistBtn", () => this.createPlaylist());
    bind("newPlaylistName", () => this.createPlaylist(), "keypress");
    bind("backToPlaylists", () => this.showPlaylistList());
    bind("deletePlaylistBtn", () => this.deleteCurrentPlaylist());
    bind("profileSettings", (e) => { e.preventDefault(); window.location.href = "ProfileSettings.html"; });
    bind("signOutBtn", (e) => { e.preventDefault(); this.handleSignOut(); });
    bind("createPlaylistModalBtn", () => this.createPlaylistFromModal());
    bind("newPlaylistNameModal", () => this.createPlaylistFromModal(), "keypress");
  }

  isUserAuthenticated() {
    return !!(this.initialized && this.currentUser &&
      window.firebaseAuth && window.firebaseAuth.currentUser);
  }

  // ---------- CRUD ----------
  _col() {
    return this.db.collection("users").doc(this.currentUser.uid).collection("playlists");
  }

  async createPlaylist() {
    const input = document.getElementById("newPlaylistName");
    return this._createPlaylist(input?.value.trim(), input);
  }

  async createPlaylistFromModal() {
    const input = document.getElementById("newPlaylistNameModal");
    const name = input?.value.trim();
    const ok = await this._createPlaylist(name, input);
    if (ok) {
      const modal = bootstrap.Modal.getInstance(document.getElementById("createPlaylistModal"));
      if (modal) modal.hide();
    }
  }

  async _createPlaylist(name, inputEl) {
    if (!name) { alert("Please enter a playlist name"); return false; }
    if (name.length > 50) { alert("Playlist name must be 50 characters or less"); return false; }
    if (!this.isUserAuthenticated()) { alert("Please log in to create playlists"); return false; }
    if (this.playlists.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert("A playlist with this name already exists");
      return false;
    }

    try {
      await this._col().add({
        name,
        tracks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (inputEl) inputEl.value = "";
      await this.loadPlaylists();
      this.showNotification("Playlist created successfully", "success");
      return true;
    } catch (err) {
      console.error(err);
      this.showNotification("Could not create playlist: " + err.message, "error");
      return false;
    }
  }

  async loadPlaylists() {
    if (!this.isUserAuthenticated()) return;
    try {
      const snap = await this._col().orderBy("updatedAt", "desc").get();
      this.playlists = [];
      snap.forEach((doc) => this.playlists.push({ id: doc.id, ...doc.data() }));

      // Populate missing tracks
      for (const pl of this.playlists) {
        if (!pl.tracks || pl.tracks.length === 0) {
          pl.tracks = await this.loadPlaylistTracks(pl.id);
        }
      }

      window.dispatchEvent(new Event("playlistsUpdated"));
    } catch (err) {
      console.error("Error loading playlists:", err);
      this.showNotification("Could not load playlists", "error");
    }
  }

  async loadPlaylistTracks(playlistId) {
    if (!this.isUserAuthenticated()) return [];
    try {
      const doc = await this._col().doc(playlistId).get();
      return doc.exists ? (doc.data().tracks || []) : [];
    } catch (err) {
      console.error("Error loading tracks:", err);
      return [];
    }
  }

  // Alias for the enhancer
  async loadPlaylistTracksForSpotify(playlistId) {
    return this.loadPlaylistTracks(playlistId);
  }

  async addTrackToPlaylist(playlistId, track) {
    if (!this.isUserAuthenticated()) {
      return { success: false, message: "Please log in to use playlists" };
    }
    try {
      const ref = this._col().doc(playlistId);
      const doc = await ref.get();
      if (!doc.exists) throw new Error("Playlist not found");
      const data = doc.data();
      const tracks = data.tracks || [];
      if (tracks.some((t) => t.file === track.file)) {
        return { success: false, message: "Track already in playlist" };
      }
      tracks.push({
        title: track.title, artist: track.artist, file: track.file,
        cover: track.cover, duration: track.duration || 0,
        addedAt: new Date(),
      });
      await ref.update({ tracks, updatedAt: new Date() });
      return { success: true, message: "Added to playlist" };
    } catch (err) {
      console.error("Error adding track:", err);
      return { success: false, message: err.message || "Could not add track" };
    }
  }

  async getPlaylistsForTrack(track) {
    if (!this.isUserAuthenticated()) return [];
    try {
      const snap = await this._col().get();
      const out = [];
      snap.forEach((doc) => {
        const data = doc.data();
        const tracks = Array.isArray(data.tracks) ? data.tracks : [];
        out.push({
          id: doc.id,
          name: data.name || "Untitled",
          count: tracks.length,
          cover: tracks.length ? (tracks[0].cover || "") : "",
          hasTrack: tracks.some((t) => t.file === track.file),
        });
      });
      return out;
    } catch (err) {
      console.error("Error loading playlists for track:", err);
      return [];
    }
  }

  async deletePlaylist(playlistId) {
    if (!confirm("Delete this playlist? This cannot be undone.")) return;
    try {
      await this._col().doc(playlistId).delete();
      await this.loadPlaylists();
      this.showNotification("Playlist deleted", "success");
    } catch (err) {
      console.error(err);
      this.showNotification("Could not delete playlist", "error");
    }
  }

  async deleteCurrentPlaylist() {
    if (this.currentPlaylist) {
      await this.deletePlaylist(this.currentPlaylist.id);
      bootstrap.Modal.getInstance(document.getElementById("playlistModal"))?.hide();
    }
  }

  async handleSignOut() {
    try {
      await window.firebaseAuth.signOut();
    } catch (err) {
      this.showNotification("Sign out failed", "error");
    }
  }

  // ---------- Notifications ----------
  showNotification(message, type = "success") {
    document.querySelector(".playlist-notification")?.remove();
    const el = document.createElement("div");
    el.className = `playlist-notification playlist-notification-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}

// ---------- Boot ----------
let playlistManagerFixed;
document.addEventListener("DOMContentLoaded", () => {
  console.log("🎵 Initializing Playlist Manager…");
  playlistManagerFixed = new PlaylistManagerFixed();
  window.playlistManagerFixed = playlistManagerFixed;
  console.log("✅ Playlist Manager exposed as window.playlistManagerFixed");
});
