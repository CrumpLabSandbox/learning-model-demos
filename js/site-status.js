// Site status, read by every page before it draws. While IN_DEVELOPMENT is
// true, every page shows a thin strip saying the site is still being built,
// with a link to the status note on the About page. Set it to false to hide
// the strip everywhere; nothing else needs to change.
//
// This is a plain (non-module) script so it runs before the page is drawn and
// the strip never makes the page jump. The strip itself is in each page's
// markup (class "dev-strip"); this only marks <html> so the stylesheet shows it.
(function () {
  var IN_DEVELOPMENT = true;

  if (IN_DEVELOPMENT) document.documentElement.setAttribute('data-dev', '');
})();
