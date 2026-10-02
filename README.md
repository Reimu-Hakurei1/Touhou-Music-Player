# Touhou Music Player

Listen to Touhou music, organize playlists, and share songs with other listeners.

## Website

**Play now:** [touhou-music-player.pages.dev](https://touhou-music-player.pages.dev/)

## Features

- Browse, search, and filter the music catalog.
- Play songs with shuffle, repeat, a playback queue, and compact or expanded player views.
- Keep a local list of liked songs and recently played tracks.
- Create and manage cloud playlists when signed in.
- See song like counts and share links that open a specific song.
- Read song comments; sign in to post, edit, or delete your own comments.
- Download songs in their original format or convert them to MP3 where supported.
- Use the responsive player on desktop, tablet, and mobile devices.

## Run locally

This is a static HTML, CSS, and JavaScript website; it does not require a build step.

1. Serve the project folder with a local web server. For XAMPP, place it under `htdocs` and start Apache.
2. Open the local site in your browser, for example `http://localhost/Touhou%20Music%20Player/`.
3. Firebase Authentication and Cloud Firestore are used for accounts, playlists, likes, and comments. Configure the Firebase project in `firebase-config.js`, enable the authentication method used by the site, and publish Firestore security rules for the app's data paths.

Song and cover media are served from Cloudflare R2; their base URL is configured in `media-url-helper.js`.

## Built with

- HTML, CSS, and vanilla JavaScript
- Firebase Authentication and Cloud Firestore
- Bootstrap, Font Awesome, and Google Fonts

