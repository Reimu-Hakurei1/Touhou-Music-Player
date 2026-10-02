(() => {
  const key = 'touhou-player-theme';
  const readTheme = () => {
    try { return localStorage.getItem(key) === 'light' ? 'light' : 'dark'; }
    catch (_) { return 'dark'; }
  };
  const applyTheme = (theme, persist = true) => {
    const value = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = value;
    if (persist) {
      try { localStorage.setItem(key, value); } catch (_) { /* Theme remains active for this page. */ }
    }
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const light = value === 'light';
      const label = light ? 'Dark Mode' : 'Light Mode';
      const icon = button.querySelector('i');
      if (icon) icon.className = `fas ${light ? 'fa-moon' : 'fa-sun'}`;
      const text = button.querySelector('span');
      if (text) text.textContent = label;
      button.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
      button.setAttribute('aria-pressed', String(light));
    });
    window.dispatchEvent(new CustomEvent('touhouthemechange', { detail: { theme: value } }));
  };
  window.setTouhouTheme = applyTheme;
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(readTheme(), false);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === key) applyTheme(event.newValue, false);
  });
})();
