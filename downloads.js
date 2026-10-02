(() => {
  const status = document.getElementById('downloadsReleaseStatus');
  const downloadLinks = [...document.querySelectorAll('[data-download-asset]')];
  if (!status || !downloadLinks.length) return;

  const repo = 'Reimu-Hakurei1/Touhou-Music-Player';
  const fallback = 'Desktop downloads are published with app releases.';

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
        available++;
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.classList.add('unavailable');
      }
    });
    status.textContent = available
      ? `Latest desktop release: ${release.tag_name}. Choose a package above.`
      : `Release ${release.tag_name} does not include desktop installers yet.`;
  }).catch((error) => {
    if (error.message === 'not-published') {
      downloadLinks.forEach((link) => {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.classList.add('unavailable');
      });
      status.textContent = 'The first desktop app release has not been published yet.';
      return;
    }
    status.textContent = fallback;
    console.warn('Could not check the latest desktop release:', error);
  });
})();
