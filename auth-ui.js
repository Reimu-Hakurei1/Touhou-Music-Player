document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-password-target]').forEach((button) => {
    const input = document.getElementById(button.dataset.passwordTarget);
    if (!input) return;

    button.addEventListener('click', () => {
      const shouldShow = input.type === 'password';
      input.type = shouldShow ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(shouldShow));
      button.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
      button.innerHTML = `<i class="far ${shouldShow ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>`;
    });
  });
});
