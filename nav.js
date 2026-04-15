/* nav.js — injects shared header and footer */
(function () {
  const pages = [
    { href: 'index.html',         label: 'Home' },
    { href: 'masses.html',        label: 'Mass Times' },
    { href: 'news.html',          label: 'News' },
    { href: 'history.html',       label: 'History' },
    { href: 'safeguarding.html',  label: 'Safeguarding' },
    { href: 'contact.html',       label: 'Contact' },
  ];

  const current = location.pathname.split('/').pop() || 'index.html';

  const navLinks = pages.map(p =>
    `<li><a href="${p.href}"${current === p.href ? ' class="active" aria-current="page"' : ''}>${p.label}</a></li>`
  ).join('');

  const headerHTML = `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="top-banner">Diocese of Limerick &nbsp;&#10015;&nbsp; Askeaton &amp; Ballysteen Parish</div>
    <header class="site-header" role="banner">
      <div class="header-inner">
        <a href="index.html" class="header-brand" aria-label="Askeaton &amp; Ballysteen Parish home">
          <img src="images/logo_coloured.png" alt="Parish logo" width="58" height="58">
          <div class="brand-text">
            <span class="brand-name">Askeaton &amp; Ballysteen Parish</span>
            <span class="brand-sub">Diocese of Limerick &middot; Ireland</span>
          </div>
        </a>
        <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" id="navToggle">
          <span></span><span></span><span></span>
        </button>
        <nav class="main-nav" id="mainNav" aria-label="Main navigation">
          <ul>${navLinks}</ul>
        </nav>
      </div>
    </header>`;

  const footerHTML = `
    <footer class="site-footer" role="contentinfo">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="images/parish_crest.png" alt="Parish Crest">
            <div class="footer-brand-name">Askeaton &amp; Ballysteen Parish</div>
            <div class="footer-tagline">Ad Jesum per Mariam</div>
          </div>
          <div>
            <div class="footer-heading">Quick Links</div>
            <ul class="footer-links">
              ${pages.map(p => `<li><a href="${p.href}">${p.label}</a></li>`).join('')}
            </ul>
          </div>
          <div>
            <div class="footer-heading">Parish Office</div>
            <ul class="footer-links">
              <li>Fr. John Mockler</li>
              <li><a href="tel:+353862342242">086&ndash;234 2242</a></li>
              <li><a href="tel:+35361398077">061&ndash;398 077</a> (Wed)</li>
              <li><a href="mailto:easbaile@gmail.com">easbaile@gmail.com</a></li>
              <li>Office: Wednesdays 9am&ndash;5pm</li>
            </ul>
          </div>
          <div>
            <div class="footer-heading">Diocese &amp; Links</div>
            <ul class="footer-links">
              <li><a href="https://www.limerickdiocese.org" target="_blank" rel="noopener">Diocese of Limerick</a></li>
              <li><a href="https://www.facebook.com/AskeatonBallysteenParish" target="_blank" rel="noopener">Facebook Page</a></li>
              <li><a href="https://www.catholicireland.net" target="_blank" rel="noopener">Catholic Ireland</a></li>
              <li><a href="safeguarding.html">Safeguarding</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; <span id="fyear"></span> Askeaton &amp; Ballysteen Parish. Diocese of Limerick.</span>
          <span>Parish email: <a href="mailto:easbaile@gmail.com" style="color:inherit">easbaile@gmail.com</a></span>
        </div>
      </div>
    </footer>`;

  const headerEl = document.getElementById('site-header-placeholder');
  const footerEl = document.getElementById('site-footer-placeholder');
  if (headerEl) headerEl.outerHTML = headerHTML;
  if (footerEl) footerEl.outerHTML = footerHTML;

  const fy = document.getElementById('fyear');
  if (fy) fy.textContent = new Date().getFullYear();

  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', false);
      }
    });
  }
})();
