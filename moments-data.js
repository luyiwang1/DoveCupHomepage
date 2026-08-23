(function (root) {
  'use strict';

  const photoSlots = {
    1: { src: 'assets/moments/event-01.webp', focusX: 50, focusY: 72, zoom: 1.02 },
    2: { src: 'assets/moments/event-02.webp', focusX: 50, focusY: 69, zoom: 1.02 },
    3: { src: 'assets/moments/event-03.webp', focusX: 50, focusY: 88, zoom: 1.08 },
    4: { src: 'assets/moments/event-04.webp', focusX: 50, focusY: 100, zoom: 1.14 },
    5: { src: 'assets/moments/event-05-v2.webp', focusX: 50, focusY: 82, zoom: 1.06 },
    6: { src: 'assets/moments/event-05.webp', focusX: 50, focusY: 91, zoom: 1.1 },
    7: { src: 'assets/moments/event-06.webp', focusX: 50, focusY: 86, zoom: 1.08 },
    8: { src: 'assets/moments/event-08-v4.webp', focusX: 50, focusY: 72, zoom: 1.04 },
    9: { src: 'assets/moments/event-07-v2.webp', focusX: 50, focusY: 100, zoom: 1.16 },
    10: { src: 'assets/moments/event-08-v2.webp', focusX: 50, focusY: 88, zoom: 1.08 },
    11: { src: 'assets/moments/event-09.webp', focusX: 50, focusY: 100, zoom: 1.24 },
    12: { src: 'assets/events/2026-08-08/team-group-photo-01.webp', focusX: 40, focusY: 100, zoom: 1.5 },
    13: { src: 'assets/moments/event-11.webp', focusX: 50, focusY: 100, zoom: 1.12 }
  };

  const specialEvents = {
    8: {
      title: '金鸽 × 大鱼杯',
      titleEn: 'Golden Dove x Big Fish Cup',
      typeLabel: '特殊赛事',
      typeLabelEn: 'Special Event',
      caption: '金鸽 × 大鱼杯活动合影',
      captionEn: 'Golden Dove x Big Fish Cup group photo'
    },
    12: {
      title: '凤凰 vs 狮鹫',
      titleEn: 'Phoenix vs Griffin',
      typeLabel: '特殊团体赛',
      typeLabelEn: 'Special Team Event',
      caption: '凤凰 vs 狮鹫团体赛合影',
      captionEn: 'Phoenix vs Griffin team event group photo'
    }
  };

  const moments = Array.from({ length: 13 }, (_, index) => {
    const eventNumber = index + 1;
    const special = specialEvents[eventNumber] || null;
    const photo = photoSlots[eventNumber] || null;
    const paddedNumber = String(eventNumber).padStart(2, '0');
    const title = special ? special.title : '金鸽巡回赛';
    const titleEn = special ? special.titleEn : 'Golden Dove Tour';
    const typeLabel = special ? special.typeLabel : '常驻巡回赛';
    const typeLabelEn = special ? special.typeLabelEn : 'Resident Tour';
    const caption = `EVENT ${paddedNumber} · ${special ? special.caption : '金鸽巡回赛活动合影'}`;
    const captionEn = `EVENT ${paddedNumber} · ${special ? special.captionEn : 'Golden Dove Tour group photo'}`;

    return {
      eventNumber,
      paddedNumber,
      type: special ? 'special' : 'tour',
      typeLabel,
      typeLabelEn,
      title,
      titleEn,
      venue: 'MRTC · Toronto',
      summary: '',
      summaryEn: '',
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
