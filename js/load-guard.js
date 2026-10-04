// A plain (non-module) script loaded before each page's module. If the page's
// module never finishes starting, for example because the browser kept an old
// copy of one file after an update, show a short message with a reload button
// instead of leaving a broken page. Each page's mount function marks the page
// ready by setting data-ready on <html>.
(function () {
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (document.documentElement.hasAttribute('data-ready')) return;
      var bar = document.createElement('div');
      bar.className = 'load-warning';
      bar.setAttribute('role', 'alert');
      bar.innerHTML =
        '<strong>This page did not finish loading.</strong> Your browser may have kept an old copy of part of it. ' +
        '<button type="button" class="btn primary">Reload the page</button> ' +
        '<span>If that does not help, hold Shift while you reload.</span>';
      bar.querySelector('button').onclick = function () {
        location.reload();
      };
      document.body.insertBefore(bar, document.body.firstChild);
    }, 2500);
  });
})();
