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

  const venues = [
    { key: 'mrtc', name: 'MRTC' },
    { key: 'nyta-east', name: 'NYTA East Bubble' }
  ];

  function allMoments(venueKey) {
    return Array.isArray(root.DOVE_MOMENTS)
      ? [...root.DOVE_MOMENTS].filter(moment => !venueKey || (moment.venueKey || 'mrtc') === venueKey).sort((a, b) => a.eventNumber - b.eventNumber)
      : [];
  }

  function photoMoments(venueKey) {
    return allMoments(venueKey).filter(moment => moment && moment.photo && moment.photo.src);
  }

  function galleryEvent(venueKey) {
    const event = root.DOVE_MOMENTS_GALLERY || null;
    if (!event || !venueKey) return event;
    const numbers = new Set(photoMoments(venueKey).map(moment => moment.eventNumber));
    return { ...event, id: `${event.id}-${venueKey}`, gallery: { ...event.gallery,
      title: `${venues.find(venue => venue.key === venueKey)?.name || venueKey} · 活动影集`,
      titleEn: `${venues.find(venue => venue.key === venueKey)?.name || venueKey} · Moments`,
      photos: event.gallery.photos.filter(photo => numbers.has(photo.eventNumber))
    } };
  }

  function imageStyle(moment) {
    const photo = moment && moment.photo || {};
    const x = Number.isFinite(Number(photo.focusX)) ? Number(photo.focusX) : 50;
    const y = Number.isFinite(Number(photo.focusY)) ? Number(photo.focusY) : 50;
    const zoom = Number.isFinite(Number(photo.zoom)) ? Number(photo.zoom) : 1;
    return `--moment-x:${x}%;--moment-y:${y}%;--moment-zoom:${zoom}`;
  }

  function momentDetails(moment, lang = language()) {
    return [copy(moment, 'dateLabel', lang), copy(moment, 'schedule', lang), copy(moment, 'venue', lang)]
      .filter(Boolean)
      .join(' · ');
  }

  function openMoment(eventNumber) {
    const moment = allMoments().find(item => Number(item.eventNumber) === Number(eventNumber));
    const event = galleryEvent(moment && (moment.venueKey || 'mrtc'));
    const photos = event && event.gallery && Array.isArray(event.gallery.photos)
      ? event.gallery.photos
      : [];
    const index = photos.findIndex(photo => Number(photo.eventNumber) === Number(eventNumber));
    if (index < 0 || !root.DoveGallery || !root.DoveGallery.openEventGallery) return false;
    return root.DoveGallery.openEventGallery(event, index);
  }

  function randomStartIndex(length, random = Math.random) {
    const total = Math.max(0, Math.floor(Number(length) || 0));
    if (total < 2) return 0;
    const sample = Number(random());
    const normalized = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 0.999999999) : 0;
    return Math.floor(normalized * total);
  }

  function mountCarousel(targetOrId) {
    if (typeof document === 'undefined') return null;
    const target = typeof targetOrId === 'string' ? document.getElementById(targetOrId) : targetOrId;
    if (!target) return null;
    let selectedVenue = 'mrtc';
    let moments = photoMoments(selectedVenue);
    const compact = typeof root.matchMedia === 'function' && root.matchMedia('(max-width: 560px)').matches;
    const startIndex = compact ? 0 : randomStartIndex(moments.length);

    function card(moment, index, duplicate) {
      const lang = language();
      const text = (zh, en) => lang === 'en' ? en : zh;
      const special = moment.type === 'special' ? ' special' : '';
      const load = !duplicate && index === startIndex ? 'fetchpriority="high"' : 'loading="lazy"';
      const hidden = duplicate ? ' tabindex="-1"' : '';
      return `<button class="moment-slide${special}" type="button" data-moment-slide="${moment.eventNumber}" style="${imageStyle(moment)}" onclick="DoveMoments.openMoment(${moment.eventNumber})"${hidden} aria-label="${escapeHtml(text(`全屏查看 EVENT ${moment.paddedNumber} 照片`, `View the Event ${moment.paddedNumber} photo fullscreen`))}"><img src="${escapeHtml(moment.photo.src)}" alt="${escapeHtml(copy(moment.photo, 'alt', lang))}" ${load}><span class="moment-slide-caption"><span class="moment-slide-kicker">EVENT ${moment.paddedNumber} · ${escapeHtml(copy(moment, 'typeLabel', lang))}</span><strong>${escapeHtml(copy(moment, 'title', lang))}</strong><small>${escapeHtml(momentDetails(moment, lang))}</small></span></button>`;
    }

    function render() {
      const lang = language();
      const text = (zh, en) => lang === 'en' ? en : zh;
      moments = photoMoments(selectedVenue);
      const startDelay = moments.length ? (190 * (startIndex % moments.length) / moments.length).toFixed(3) : '0';
      const primary = moments.map((moment, index) => card(moment, index, false)).join('');
      const duplicate = moments.map((moment, index) => card(moment, index, true)).join('');
      target.setAttribute('data-dove-no-translate', '');
      target.innerHTML = `<div class="moments-head moments-head-simple"><h2>Dove Cup Moments</h2><div class="moment-venue-tabs" role="group" aria-label="${text('照片场地', 'Photo venue')}">${venues.map(venue => `<button type="button" data-moment-venue="${venue.key}" aria-pressed="${selectedVenue === venue.key}">${venue.name}</button>`).join('')}</div></div>${moments.length ? `<div class="moment-marquee" aria-label="${text('金鸽杯活动照片', 'Golden Dove event photos')}"><div class="moment-marquee-track" style="--moment-marquee-delay:-${startDelay}s"><div class="moment-marquee-group">${primary}</div><div class="moment-marquee-group" aria-hidden="true">${duplicate}</div></div></div>` : `<div class="moment-venue-empty">${text('NYTA East 的活动照片即将更新。', 'NYTA East event photos are coming soon.')}</div>`}`;
      target.querySelectorAll('[data-moment-venue]').forEach(button => button.addEventListener('click', () => {
        selectedVenue = button.dataset.momentVenue;
        render();
      }));

      const marquee = target.querySelector('.moment-marquee');
      if (!marquee) return;
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
      function card(moment) {
        const special = moment.type === 'special';
        const body = moment.photo
          ? `<button class="moment-archive-photo" type="button" data-archive-moment="${moment.eventNumber}" style="${imageStyle(moment)}" aria-label="${escapeHtml(text(`全屏查看 EVENT ${moment.paddedNumber}`, `View Event ${moment.paddedNumber} fullscreen`))}"><img src="${escapeHtml(moment.photo.src)}" alt="${escapeHtml(copy(moment.photo, 'alt', lang))}" loading="lazy"><span class="moment-archive-stamp"><span>${escapeHtml(copy(moment, 'dateLabel', lang))} · ${escapeHtml(copy(moment, 'schedule', lang))}</span><strong>${escapeHtml(copy(moment, 'venue', lang))}</strong></span></button>`
          : `<div class="moment-archive-photo pending"><img src="golden-dove-mark.webp" alt=""><span>${text('照片待补', 'Photo Pending')}</span></div>`;
        return `<article class="moment-archive-card${special ? ' special' : ''}${moment.photo ? '' : ' pending'}">${body}<div class="moment-archive-copy"><span>EVENT ${moment.paddedNumber}</span><h3>${escapeHtml(copy(moment, 'title', lang))}</h3><p>${escapeHtml(copy(moment, 'typeLabel', lang))}</p></div></article>`;
      }
      target.innerHTML = venues.map(venue => {
        const items = moments.filter(moment => (moment.venueKey || 'mrtc') === venue.key);
        return `<section class="moment-venue-section" id="${venue.key}"><div class="moment-venue-heading"><h2>${venue.name}</h2><span>${text(`${items.length} 次活动`, `${items.length} Events`)}</span></div>${items.length ? `<div class="moment-archive-grid">${items.map(card).join('')}</div>` : `<div class="moment-venue-empty">${text('NYTA East 的活动照片即将更新。', 'NYTA East event photos are coming soon.')}</div>`}</section>`;
      }).join('');
      target.querySelectorAll('[data-archive-moment]').forEach(button => {
        button.addEventListener('click', () => openMoment(button.dataset.archiveMoment));
      });
    }

    root.addEventListener('dove:languagechange', render);
    render();
    return target;
  }

  return { allMoments, photoMoments, galleryEvent, openMoment, randomStartIndex, mountCarousel, mountArchive };
}));
