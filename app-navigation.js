(() => {
  const pages = {
    settings: document.getElementById('profileSettingsView'),
    downloads: document.getElementById('downloadsView')
  };

  function setAppPage(page = 'player', options = {}) {
    const activePage = Object.prototype.hasOwnProperty.call(pages, page) ? page : 'player';
    const isSecondary = activePage !== 'player';

    document.body.classList.toggle('app-secondary-view', isSecondary);
    document.body.classList.remove('show-playlists');
    pages.settings.hidden = activePage !== 'settings';
    pages.downloads.hidden = activePage !== 'downloads';
    pages.settings.setAttribute('aria-hidden', String(activePage !== 'settings'));
    pages.downloads.setAttribute('aria-hidden', String(activePage !== 'downloads'));

    const playlistButton = document.getElementById('myPlaylistsBtn');
    if (playlistButton) playlistButton.innerHTML = '<i class="fas fa-list-ul"></i> My Playlists';

    document.getElementById('dropdownMenu')?.classList.remove('show');
    document.getElementById('profileToggle')?.setAttribute('aria-expanded', 'false');
    document.getElementById('bigPlayer')?.classList.remove('active');
    document.getElementById('playerActionMenu')?.classList.remove('open');
    document.getElementById('bigPlayerActionMenu')?.classList.remove('open');

    if (options.updateHash !== false) {
      const hash = activePage === 'settings' ? '#settings' : activePage === 'downloads' ? '#downloads' : '';
      history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    }

    window.dispatchEvent(new CustomEvent('appviewchange', { detail: { page: activePage } }));
    window.scrollTo(0, 0);
  }

  window.setAppPage = setAppPage;

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('profileSettings')?.addEventListener('click', (event) => {
      event.preventDefault();
      setAppPage('settings');
    });
    document.getElementById('downloadsBtn')?.addEventListener('click', () => setAppPage('downloads'));
    document.getElementById('backToPlayerFromSettings')?.addEventListener('click', () => setAppPage('player'));
    document.getElementById('backToPlayerFromDownloads')?.addEventListener('click', () => setAppPage('player'));

    const initialPage = location.hash === '#settings' ? 'settings' : location.hash === '#downloads' ? 'downloads' : 'player';
    setAppPage(initialPage, { updateHash: false });
  });
})();
