(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoveMoments = api;
}(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function language() {
    return root.DoveLanguage && root.DoveLanguage.getLanguage
      ? root.DoveLanguage.getLanguage()
      : 'zh';
  }

  function copy(record, key, lang = language()) {
    if (!record) return '';
    return String(lang === 'en' && record[`${key}En`] ? record[`${key}En`] : record[key] || '');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function allMoments() {
    return Array.isArray(root.DOVE_MOMENTS)
      ? [...root.DOVE_MOMENTS].sort((a, b) => a.eventNumber - b.eventNumber)
      : [];
  }

  function photoMoments() {
    return allMoments().filter(moment => moment && moment.photo && moment.photo.src);
  }

  function galleryEvent() {
    return root.DOVE_MOMENTS_GALLERY || null;
  }

  function imageStyle(moment) {
    const photo = moment && moment.photo || {};
    const x = Number.isFinite(Number(photo.focusX)) ? Number(photo.focusX) : 50;
    const y = Number.isFinite(Number(photo.focusY)) ? Number(photo.focusY) : 50;
    const zoom = Number.isFinite(Number(photo.zoom)) ? Number(photo.zoom) : 1;
    return `--moment-x:${x}%;--moment-y:${y}%;--moment-zoom:${zoom}`;
  }

  function openMoment(eventNumber) {
    const event = galleryEvent();
    const photos = event && event.gallery && Array.isArray(event.gallery.photos)
      ? event.gallery.photos
      : [];
    const index = photos.findIndex(photo => Number(photo.eventNumber) === Number(eventNumber));
    if (index < 0 || !root.DoveGallery || !root.DoveGallery.openEventGallery) return false;
    return root.DoveGallery.openEventGallery(event, index);
  }

  function mountCarousel(targetOrId) {
    if (typeof document === 'undefined') return null;
    const target = typeof targetOrId === 'string' ? document.getElementById(targetOrId) : targetOrId;
    const moments = photoMoments();
    if (!target || !moments.length) return null;

    function card(moment, index, duplicate) {
      const lang = language();
      const text = (zh, en) => lang === 'en' ? en : zh;
      const special = moment.type === 'special' ? ' special' : '';
      const load = !duplicate && index === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
      const hidden = duplicate ? ' tabindex="-1"' : '';
      return `<button class="moment-slide${special}" type="button" data-moment-slide="${moment.eventNumber}" style="${imageStyle(moment)}" onclick="DoveMoments.openMoment(${moment.eventNumber})"${hidden} aria-label="${escapeHtml(text(`全屏查看 EVENT ${moment.paddedNumber} 照片`, `View the Event ${moment.paddedNumber} photo fullscreen`))}"><img src="${escapeHtml(moment.photo.src)}" alt="${escapeHtml(copy(moment.photo, 'alt', lang))}" ${load}><span class="moment-slide-caption"><span>EVENT ${moment.paddedNumber} · ${escapeHtml(copy(moment, 'typeLabel', lang))}</span><strong>${escapeHtml(copy(moment, 'title', lang))}</strong></span></button>`;
    }

    function render() {
      const lang = language();
      const text = (zh, en) => lang === 'en' ? en : zh;
      const primary = moments.map((moment, index) => card(moment, index, false)).join('');
      const duplicate = moments.map((moment, index) => card(moment, index, true)).join('');
      target.setAttribute('data-dove-no-translate', '');
      target.innerHTML = `<div class="moments-head moments-head-simple"><h2>Dove Cup Moments</h2></div><div class="moment-marquee" aria-label="${text('金鸽杯活动照片', 'Golden Dove event photos')}"><div class="moment-marquee-track"><div class="moment-marquee-group">${primary}</div><div class="moment-marquee-group" aria-hidden="true">${duplicate}</div></div></div>`;

      const marquee = target.querySelector('.moment-marquee');
      const resume = () => marquee.classList.remove('is-paused');
      marquee.addEventListener('pointerdown', () => marquee.classList.add('is-paused'));
      marquee.addEventListener('pointerup', resume);
      marquee.addEventListener('pointercancel', resume);
      marquee.addEventListener('pointerleave', resume);
    }

    root.addEventListener('dove:languagechange', render);
    render();
    return target;
  }

  function mountArchive(targetOrId, countOrId) {
    if (typeof document === 'undefined') return null;
    const target = typeof targetOrId === 'string' ? document.getElementById(targetOrId) : targetOrId;
    const countTarget = typeof countOrId === 'string' ? document.getElementById(countOrId) : countOrId;
    if (!target) return null;

    function render() {
      const lang = language();
      const text = (zh, en) => lang === 'en' ? en : zh;
      const moments = allMoments().reverse();
      const photoCount = moments.filter(moment => moment.photo).length;
      target.setAttribute('data-dove-no-translate', '');
      if (countTarget) countTarget.textContent = text(`${photoCount} 张照片 · ${moments.length} 次活动`, `${photoCount} Photos · ${moments.length} Events`);
      target.innerHTML = moments.map(moment => {
        const special = moment.type === 'special';
        const body = moment.photo
          ? `<button class="moment-archive-photo" type="button" data-archive-moment="${moment.eventNumber}" style="${imageStyle(moment)}" aria-label="${escapeHtml(text(`全屏查看 EVENT ${moment.paddedNumber}`, `View Event ${moment.paddedNumber} fullscreen`))}"><img src="${escapeHtml(moment.photo.src)}" alt="${escapeHtml(copy(moment.photo, 'alt', lang))}" loading="lazy"></button>`
          : `<div class="moment-archive-photo pending"><img src="golden-dove-mark.webp" alt=""><span>${text('照片待补', 'Photo Pending')}</span></div>`;
        return `<article class="moment-archive-card${special ? ' special' : ''}${moment.photo ? '' : ' pending'}">${body}<div class="moment-archive-copy"><span>EVENT ${moment.paddedNumber}</span><h3>${escapeHtml(copy(moment, 'title', lang))}</h3><p>${escapeHtml(copy(moment, 'typeLabel', lang))}</p></div></article>`;
      }).join('');
      target.querySelectorAll('[data-archive-moment]').forEach(button => {
        button.addEventListener('click', () => openMoment(button.dataset.archiveMoment));
      });
    }

    root.addEventListener('dove:languagechange', render);
    render();
    return target;
  }

  return { allMoments, photoMoments, galleryEvent, openMoment, mountCarousel, mountArchive };
}));
