(function (root) {
  'use strict';

  const photoSlots = {
    1: { src: 'assets/moments/event-01.webp', focusX: 50, focusY: 72, zoom: 1.02 },
    2: { src: 'assets/moments/event-02.webp', focusX: 50, focusY: 69, zoom: 1.02 },
    3: { src: 'assets/moments/event-03.webp', focusX: 50, focusY: 88, zoom: 1.08 },
    4: { src: 'assets/moments/event-04.webp', focusX: 50, focusY: 100, zoom: 1.14 },
    5: { src: 'assets/moments/event-05.webp', focusX: 50, focusY: 91, zoom: 1.1 },
    6: { src: 'assets/moments/event-06.webp', focusX: 50, focusY: 86, zoom: 1.08 },
    7: { src: 'assets/moments/event-07-v2.webp', focusX: 50, focusY: 100, zoom: 1.16 },
    8: { src: 'assets/moments/event-08-v2.webp', focusX: 50, focusY: 88, zoom: 1.08 },
    9: { src: 'assets/moments/event-09.webp', focusX: 50, focusY: 100, zoom: 1.24 },
    10: { src: 'assets/events/2026-08-08/team-group-photo-01.webp', focusX: 40, focusY: 100, zoom: 1.5 },
    11: { src: 'assets/moments/event-11.webp', focusX: 50, focusY: 100, zoom: 1.12 }
  };

  const moments = Array.from({ length: 11 }, (_, index) => {
    const eventNumber = index + 1;
    const special = eventNumber === 10;
    const photo = photoSlots[eventNumber] || null;
    const paddedNumber = String(eventNumber).padStart(2, '0');
    const title = special ? '凤凰 vs 狮鹫' : '金鸽巡回赛';
    const titleEn = special ? 'Phoenix vs Griffin' : 'Golden Dove Tour';
    const typeLabel = special ? '特殊团体赛' : '常驻巡回赛';
    const typeLabelEn = special ? 'Special Team Event' : 'Resident Tour';
    const caption = special
      ? `EVENT ${paddedNumber} · 凤凰 vs 狮鹫团体赛合影`
      : `EVENT ${paddedNumber} · 金鸽巡回赛活动合影`;
    const captionEn = special
      ? `EVENT ${paddedNumber} · Phoenix vs Griffin team event group photo`
      : `EVENT ${paddedNumber} · Golden Dove Tour group photo`;

    return {
      eventNumber,
      paddedNumber,
      type: special ? 'special' : 'tour',
      typeLabel,
      typeLabelEn,
      title,
      titleEn,
      venue: 'MRTC · Toronto',
      summary: special
        ? '固定混双搭档、两支队伍和完整团队赛果，都留在第 10 次活动的档案里。'
        : `第 ${eventNumber} 次金鸽巡回赛的到场合影，记录这一站一起上场的人。`,
      summaryEn: special
        ? 'Fixed mixed-doubles teams, two squads, and the complete result are preserved in the Event 10 archive.'
        : `The Event ${paddedNumber} group photo remembers everyone who joined this Golden Dove Tour stop.`,
      photo: photo ? {
        ...photo,
        alt: caption,
        altEn: captionEn,
        caption,
        captionEn
      } : null
    };
  });

  root.DOVE_MOMENTS = moments;
  root.DOVE_MOMENTS_GALLERY = {
    id: 'golden-dove-moments',
    gallery: {
      title: '金鸽杯活动档案',
      titleEn: 'Golden Dove Event Archive',
      photos: moments
        .filter(moment => moment.photo)
        .sort((a, b) => a.eventNumber - b.eventNumber)
        .map(moment => ({ ...moment.photo, eventNumber: moment.eventNumber }))
    }
  };
}(typeof window !== 'undefined' ? window : globalThis));
