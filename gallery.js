(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoveGallery = api;
}(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const mounted = new Map();
  let lightbox = null;
  let activePhotos = [];
  let activeIndex = 0;

  function language() {
    return root.DoveLanguage && root.DoveLanguage.getLanguage
      ? root.DoveLanguage.getLanguage()
      : 'zh';
  }

  function copy(record, key, lang = language()) {
    if (!record) return '';
    const translatedKey = `${key}En`;
    return String(lang === 'en' && record[translatedKey] ? record[translatedKey] : record[key] || '');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function events() {
    return Array.isArray(root.DOVE_EVENTS) ? root.DOVE_EVENTS : [];
  }

  function eventById(eventId) {
    return events().find(event => event.id === eventId) || null;
  }

  function galleryFor(event) {
    return event && event.gallery && typeof event.gallery === 'object' ? event.gallery : null;
  }

  function photosFor(event) {
    const gallery = galleryFor(event);
    return gallery && Array.isArray(gallery.photos)
      ? gallery.photos.filter(photo => photo && photo.src)
      : [];
  }

  function hasPhotos(event) {
    return photosFor(event).length > 0;
  }

  function coverFor(event) {
    const gallery = galleryFor(event);
    const photos = photosFor(event);
    return gallery && gallery.cover || (photos[0] && photos[0].src) || '';
  }

  function ensureLightbox() {
    if (lightbox || typeof document === 'undefined') return lightbox;
    lightbox = document.createElement('div');
    lightbox.className = 'dove-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('data-dove-no-translate', '');
    lightbox.innerHTML = '<button class="dove-lightbox-close" type="button">×</button><button class="dove-lightbox-nav dove-lightbox-prev" type="button">‹</button><img class="dove-lightbox-image" alt=""><button class="dove-lightbox-nav dove-lightbox-next" type="button">›</button><div class="dove-lightbox-footer"><span class="dove-lightbox-caption"></span><span class="dove-lightbox-count"></span></div>';
    lightbox.querySelector('.dove-lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.dove-lightbox-prev').addEventListener('click', () => moveLightbox(-1));
    lightbox.querySelector('.dove-lightbox-next').addEventListener('click', () => moveLightbox(1));
    lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', event => {
      if (!lightbox.classList.contains('open')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') moveLightbox(-1);
      if (event.key === 'ArrowRight') moveLightbox(1);
    });
    document.body.appendChild(lightbox);
    return lightbox;
  }

  function updateLightbox() {
    if (!lightbox || !activePhotos.length) return;
    const lang = language();
    const photo = activePhotos[activeIndex];
    const image = lightbox.querySelector('.dove-lightbox-image');
    const alt = copy(photo, 'alt', lang);
    image.src = photo.src;
    image.alt = alt;
    lightbox.querySelector('.dove-lightbox-caption').textContent = copy(photo, 'caption', lang) || alt;
    lightbox.querySelector('.dove-lightbox-count').textContent = `${activeIndex + 1} / ${activePhotos.length}`;
    lightbox.querySelector('.dove-lightbox-close').setAttribute('aria-label', lang === 'en' ? 'Close gallery' : '关闭影集');
    lightbox.querySelector('.dove-lightbox-prev').setAttribute('aria-label', lang === 'en' ? 'Previous photo' : '上一张照片');
    lightbox.querySelector('.dove-lightbox-next').setAttribute('aria-label', lang === 'en' ? 'Next photo' : '下一张照片');
  }

  function openLightbox(event, index) {
    activePhotos = photosFor(event);
    if (!activePhotos.length) return;
    activeIndex = Math.max(0, Math.min(Number(index) || 0, activePhotos.length - 1));
    ensureLightbox();
    updateLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.dove-lightbox-close').focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function moveLightbox(direction) {
    if (!activePhotos.length) return;
    activeIndex = (activeIndex + direction + activePhotos.length) % activePhotos.length;
    updateLightbox();
  }

  function render(target, event) {
    const gallery = galleryFor(event);
    if (!target || !gallery) return;
    const lang = language();
    const photos = photosFor(event);
    target.setAttribute('data-dove-no-translate', '');
    if (!photos.length) {
      target.innerHTML = `<div class="dove-gallery-pending"><div class="dove-gallery-cover"><img src="${escapeHtml(coverFor(event))}" alt="${escapeHtml(copy(gallery, 'coverAlt', lang))}" loading="lazy"><span class="dove-gallery-cover-label">${lang === 'en' ? 'Photo archive · Coming soon' : '活动影集 · 整理中'}</span></div><div class="dove-gallery-pending-copy"><span class="kicker">Dove Cup Moments</span><h3>${escapeHtml(copy(gallery, 'title', lang))}</h3><p>${escapeHtml(copy(gallery, 'pending', lang))}</p><span class="dove-gallery-state">${lang === 'en' ? 'Photos being prepared' : '现场照片整理中'}</span></div></div>`;
      return;
    }
    target.innerHTML = `<div class="dove-gallery-grid">${photos.map((photo, index) => `<button class="dove-gallery-item" type="button" data-gallery-index="${index}" aria-label="${escapeHtml((lang === 'en' ? 'Open photo ' : '打开照片 ') + (index + 1))}"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(copy(photo, 'alt', lang))}" loading="lazy"><span class="dove-gallery-caption">${escapeHtml(copy(photo, 'caption', lang))}</span></button>`).join('')}</div>`;
    target.querySelectorAll('[data-gallery-index]').forEach(button => {
      button.addEventListener('click', () => openLightbox(event, button.dataset.galleryIndex));
    });
  }

  function mountEventGallery(targetOrId, eventId) {
    if (typeof document === 'undefined') return null;
    const target = typeof targetOrId === 'string' ? document.getElementById(targetOrId) : targetOrId;
    const event = eventById(eventId);
    if (!target || !event || !galleryFor(event)) return null;
    mounted.set(target, event);
    render(target, event);
    return target;
  }

  if (root && root.addEventListener) {
    root.addEventListener('dove:languagechange', () => {
      mounted.forEach((event, target) => render(target, event));
      updateLightbox();
    });
  }

  return { copy, eventById, galleryFor, photosFor, hasPhotos, coverFor, mountEventGallery };
}));
