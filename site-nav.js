(function () {
  'use strict';

  function currentLanguage() {
    return window.DoveLanguage && window.DoveLanguage.getLanguage
      ? window.DoveLanguage.getLanguage()
      : 'zh';
  }

  function pageName() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function mount() {
    if (!document.body) return;
    const lang = currentLanguage();
    const text = (zh, en) => lang === 'en' ? en : zh;
    const page = pageName();
    let nav = document.querySelector('.dove-site-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'dove-site-nav';
      nav.setAttribute('data-dove-no-translate', '');
      document.body.prepend(nav);
    }
    const links = [
      { href: './#about', zh: '关于', en: 'About', current: false },
      { href: 'events.html', zh: '活动', en: 'Events', current: page === 'events.html' },
      { href: 'moments.html', zh: '照片', en: 'Moments', current: page === 'moments.html' },
      { href: './#format', zh: '赛制', en: 'Format', current: false }
    ];
    nav.setAttribute('aria-label', text('全站导航', 'Site navigation'));
    nav.innerHTML = `<a class="dove-site-brand" href="./"><span class="dove-site-brand-mark"><img src="golden-dove-mark.webp" alt=""></span><span class="dove-site-brand-name">${text('金鸽杯', 'Golden Dove Cup')}</span></a><div class="dove-site-nav-right"><div class="dove-site-links">${links.map(link => `<a class="dove-site-link" href="${link.href}"${link.current ? ' aria-current="page"' : ''}>${text(link.zh, link.en)}</a>`).join('')}</div><a class="dove-site-register" href="signup.html"${page === 'signup.html' ? ' aria-current="page"' : ''}>${text('巡回赛报名', 'Tour Registration')}</a></div>`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  window.addEventListener('dove:languagechange', mount);
}());
