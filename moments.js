(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoveMoments = api;
}(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const AUTOPLAY_DELAY = 5000;

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

    const state = {
      index: 0,
      timer: null,
      scrollTimer: null,
      settleTimer: null,
      programmaticIndex: null,
      pauseReasons: new Set(),
      pointerX: null,
      dragged: false,
      reducedMotion: root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    function pause(reason, shouldPause) {
      if (shouldPause) state.pauseReasons.add(reason);
      else state.pauseReasons.delete(reason);
      startTimer();
    }

    function canAutoplay() {
      return !state.reducedMotion && !document.hidden && state.pauseReasons.size === 0;
    }

    function resetProgress() {
      const fill = target.querySelector('.moment-progress-fill');
      if (!fill) return;
      fill.style.animation = 'none';
      void fill.offsetWidth;
      if (canAutoplay()) fill.style.animation = `moment-progress ${AUTOPLAY_DELAY}ms linear forwards`;
    }

    function startTimer() {
      root.clearTimeout(state.timer);
      resetProgress();
      if (!canAutoplay()) return;
      state.timer = root.setTimeout(() => goTo((state.index + 1) % moments.length, true), AUTOPLAY_DELAY);
    }

    function updateDetails() {
      const lang = language();
      const moment = moments[state.index];
      if (!moment) return;
      const special = moment.type === 'special';
      target.querySelector('.moments-copy').classList.toggle('is-special', special);
      target.querySelector('[data-moment-kicker]').textContent = `EVENT ${moment.paddedNumber} · ${copy(moment, 'typeLabel', lang)}`;
      target.querySelector('[data-moment-title]').textContent = copy(moment, 'title', lang);
      target.querySelector('[data-moment-summary]').textContent = copy(moment, 'summary', lang);
      target.querySelector('[data-moment-event]').textContent = copy(moment, 'typeLabel', lang);
      target.querySelector('[data-moment-venue]').textContent = moment.venue;
      target.querySelector('[data-moment-counter]').textContent = `${state.index + 1} / ${moments.length}`;
      const openButton = target.querySelector('[data-moment-open]');
      openButton.textContent = lang === 'en' ? 'View Fullscreen Photo' : '全屏查看照片';
      openButton.dataset.eventNumber = moment.eventNumber;
      target.querySelectorAll('[data-moment-dot]').forEach(button => {
        const active = Number(button.dataset.momentDot) === moment.eventNumber;
        button.classList.toggle('active', active);
        button.setAttribute('aria-current', active ? 'true' : 'false');
      });
      target.querySelectorAll('.moment-slide').forEach((slide, index) => {
        slide.classList.toggle('active', index === state.index);
        slide.tabIndex = index === state.index ? 0 : -1;
      });
      startTimer();
    }

    function slideLeft(slide) {
      const firstSlide = target.querySelector('.moment-slide');
      return slide && firstSlide ? slide.offsetLeft - firstSlide.offsetLeft : 0;
    }

    function settleProgrammaticScroll(index) {
      if (state.programmaticIndex !== index) return;
      const viewport = target.querySelector('.moment-viewport');
      const slide = target.querySelectorAll('.moment-slide')[index];
      if (viewport && slide) {
        const left = slideLeft(slide);
        if (Math.abs(viewport.scrollLeft - left) > 2) {
          viewport.scrollTo({ left, behavior: 'auto' });
        }
      }
      state.programmaticIndex = null;
      root.clearTimeout(state.settleTimer);
    }

    function goTo(index, smooth) {
      state.index = (Number(index) + moments.length) % moments.length;
      const viewport = target.querySelector('.moment-viewport');
      const slide = target.querySelectorAll('.moment-slide')[state.index];
      if (viewport && slide) {
        const shouldSmooth = smooth && !state.reducedMotion;
        state.programmaticIndex = shouldSmooth ? state.index : null;
        root.clearTimeout(state.settleTimer);
        viewport.scrollTo({
          left: slideLeft(slide),
          behavior: shouldSmooth ? 'smooth' : 'auto'
        });
        if (shouldSmooth) {
          const expectedIndex = state.index;
          state.settleTimer = root.setTimeout(() => settleProgrammaticScroll(expectedIndex), 500);
        }
      }
      updateDetails();
    }

    function render() {
      const lang = language();
      const text = (zh, en) => lang === 'en' ? en : zh;
      const currentNumber = moments[state.index] && moments[state.index].eventNumber;
      if (currentNumber) state.index = Math.max(0, moments.findIndex(moment => moment.eventNumber === currentNumber));
      target.setAttribute('data-dove-no-translate', '');
      target.innerHTML = `<div class="moments-head moments-head-simple"><h2>Dove Cup Moments</h2></div><div class="moments-layout"><div class="moment-carousel"><div class="moment-viewport" aria-label="${text('金鸽杯活动照片轮播', 'Golden Dove event photo carousel')}"><div class="moment-track">${moments.map((moment, index) => `<button class="moment-slide" type="button" data-moment-slide="${moment.eventNumber}" style="${imageStyle(moment)}" aria-label="${escapeHtml(text(`全屏查看 EVENT ${moment.paddedNumber} 照片`, `View the Event ${moment.paddedNumber} photo fullscreen`))}"><img src="${escapeHtml(moment.photo.src)}" alt="${escapeHtml(copy(moment.photo, 'alt', lang))}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}><span class="moment-slide-label">EVENT ${moment.paddedNumber}</span></button>`).join('')}</div></div><div class="moment-controls"><button class="moment-control" type="button" data-moment-prev aria-label="${text('上一张照片', 'Previous photo')}" title="${text('上一张照片', 'Previous photo')}">‹</button><span class="moment-counter" data-moment-counter></span><div class="moment-progress" aria-hidden="true"><span class="moment-progress-fill"></span></div><button class="moment-control" type="button" data-moment-next aria-label="${text('下一张照片', 'Next photo')}" title="${text('下一张照片', 'Next photo')}">›</button></div><div class="moment-timeline" aria-label="${text('活动编号', 'Event numbers')}">${allMoments().map(moment => moment.photo ? `<button type="button" data-moment-dot="${moment.eventNumber}" aria-label="EVENT ${moment.paddedNumber}">${moment.paddedNumber}</button>` : `<button type="button" class="pending" disabled aria-label="${text(`EVENT ${moment.paddedNumber} 照片待补`, `Event ${moment.paddedNumber} photo pending`)}" title="${text('照片待补', 'Photo pending')}">${moment.paddedNumber}</button>`).join('')}</div></div><div class="moments-copy"><span class="kicker" data-moment-kicker></span><h3 data-moment-title></h3><p data-moment-summary></p><div class="moments-meta"><div><span>${text('活动', 'Event')}</span><strong data-moment-event></strong></div><div><span>${text('地点', 'Venue')}</span><strong data-moment-venue></strong></div></div><button class="moments-link" type="button" data-moment-open></button></div></div>`;

      const viewport = target.querySelector('.moment-viewport');
      viewport.addEventListener('mouseenter', () => pause('hover', true));
      viewport.addEventListener('mouseleave', () => pause('hover', false));
      viewport.addEventListener('pointerdown', event => {
        root.clearTimeout(state.settleTimer);
        state.programmaticIndex = null;
        state.pointerX = event.clientX;
        state.dragged = false;
        pause('pointer', true);
      });
      viewport.addEventListener('pointermove', event => {
        if (state.pointerX !== null && Math.abs(event.clientX - state.pointerX) > 10) state.dragged = true;
      });
      viewport.addEventListener('pointerup', () => {
        state.pointerX = null;
        root.setTimeout(() => pause('pointer', false), 350);
      });
      viewport.addEventListener('pointercancel', () => {
        state.pointerX = null;
        pause('pointer', false);
      });
      viewport.addEventListener('scroll', () => {
        root.clearTimeout(state.scrollTimer);
        state.scrollTimer = root.setTimeout(() => {
          const slides = [...target.querySelectorAll('.moment-slide')];
          if (state.programmaticIndex !== null) {
            const expectedIndex = state.programmaticIndex;
            const expectedSlide = slides[expectedIndex];
            if (expectedSlide && Math.abs(viewport.scrollLeft - slideLeft(expectedSlide)) <= 2) {
              settleProgrammaticScroll(expectedIndex);
            }
            return;
          }
          const nearest = slides.reduce((best, slide, index) => {
            const distance = Math.abs(slideLeft(slide) - viewport.scrollLeft);
            return distance < best.distance ? { index, distance } : best;
          }, { index: state.index, distance: Infinity });
          if (nearest.index !== state.index) {
            state.index = nearest.index;
            updateDetails();
          }
        }, 120);
      }, { passive: true });
      target.querySelector('[data-moment-prev]').addEventListener('click', () => goTo(state.index - 1, true));
      target.querySelector('[data-moment-next]').addEventListener('click', () => goTo(state.index + 1, true));
      target.querySelector('[data-moment-open]').addEventListener('click', event => openMoment(event.currentTarget.dataset.eventNumber));
      target.querySelectorAll('[data-moment-slide]').forEach(button => {
        button.addEventListener('click', () => {
          if (!state.dragged) openMoment(button.dataset.momentSlide);
          state.dragged = false;
        });
      });
      target.querySelectorAll('[data-moment-dot]').forEach(button => {
        button.addEventListener('click', () => {
          const index = moments.findIndex(moment => moment.eventNumber === Number(button.dataset.momentDot));
          if (index >= 0) goTo(index, true);
        });
      });
      goTo(state.index, false);
    }

    document.addEventListener('visibilitychange', startTimer);
    root.addEventListener('dove:languagechange', render);
    target.addEventListener('focusin', () => pause('focus', true));
    target.addEventListener('focusout', () => root.setTimeout(() => pause('focus', target.contains(document.activeElement)), 0));
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
