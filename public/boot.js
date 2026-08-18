window.addEventListener('error', function (event) {
  var box = document.getElementById('boot-error');
  var message = document.getElementById('boot-error-msg');
  if (box) box.style.display = 'block';
  if (message) message.textContent = String(event.message || 'Unexpected startup error');
});

window.setTimeout(function () {
  var root = document.getElementById('root');
  var fallback = document.getElementById('boot-fallback');
  if (!fallback || !root || !root.contains(fallback)) return;

  var box = document.getElementById('boot-error');
  var message = document.getElementById('boot-error-msg');
  if (box) box.style.display = 'block';
  if (message) message.textContent = 'The application did not start within 20 seconds.';
}, 20000);
