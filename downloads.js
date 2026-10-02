(() => {
  const status = document.getElementById('downloadsReleaseStatus');
  const downloadLinks = [...document.querySelectorAll('[data-download-asset]')];
  if (!status || !downloadLinks.length) return;

  const repo = 'Reimu-Hakurei1/Touhou-Music-Player';
  const releasesUrl = `https://github.com/${repo}/releases`;
  fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' }
  }).then(async (response) => {
    if (!response.ok) {
      if (response.status === 404) throw new Error('not-published');
      throw new Error('release-check-failed');
    }
    return response.json();
  }).then((release) => {
    const assets = new Map((release.assets || []).map((asset) => [asset.name, asset.browser_download_url]));
    let available = 0;
    downloadLinks.forEach((link) => {
      const assetUrl = assets.get(link.dataset.downloadAsset);
      if (assetUrl) {
        link.href = assetUrl;
        link.removeAttribute('aria-disabled');
        link.classList.remove('unavailable');
        link.removeAttribute('target');
        available++;
      } else {
        link.href = release.html_url || releasesUrl;
        link.removeAttribute('aria-disabled');
        link.classList.remove('unavailable');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });
    status.textContent = available
      ? `Latest release: ${release.tag_name}. Select a package to download it.`
      : `Release ${release.tag_name} is published, but its installers are not attached yet. The buttons open the release details.`;
  }).catch((error) => {
    if (error.message === 'not-published') {
      downloadLinks.forEach((link) => {
        link.href = releasesUrl;
        link.removeAttribute('aria-disabled');
        link.classList.remove('unavailable');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
      status.textContent = 'No app release is published yet. Choose a download to view release availability, or check back after the next app release.';
      return;
    }
    downloadLinks.forEach((link) => {
      link.href = releasesUrl;
      link.removeAttribute('aria-disabled');
      link.classList.remove('unavailable');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
    status.textContent = 'Could not check download availability. Open the releases page to see the latest packages.';
    console.warn('Could not check the latest desktop release:', error);
  });
})();
