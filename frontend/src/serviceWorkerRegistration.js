// serviceWorkerRegistration.js
// Registers public/service-worker.js once the page has loaded (PWA support).
// Browsers only allow service workers on HTTPS or on localhost.
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service worker registered, scope:', reg.scope))
        .catch(err => console.error('Service worker registration failed:', err));
    });
  }
}
