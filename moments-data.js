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
    13: { src: 'assets/moments/event-11.webp', focusX: 50, focusY: 100, zoom: 1.12 },
    14: { src: 'assets/moments/event-14.jpg', focusX: 50, focusY: 100, zoom: 1.02 },
    15: { src: 'assets/events/2026-08-29/dove-king-group-photo.jpg', focusX: 50, focusY: 72, zoom: 1.08 }
  };

  const eventDates = [
    { label: '5月24日', labelEn: 'MAY 24' },
    { label: '5月31日', labelEn: 'MAY 31' },
    { label: '6月7日', labelEn: 'JUN 07' },
    { label: '6月14日', labelEn: 'JUN 14' },
    { label: '6月21日', labelEn: 'JUN 21' },
    { label: '6月28日', labelEn: 'JUN 28' },
    { label: '7月5日', labelEn: 'JUL 05' },
    { label: '7月12日', labelEn: 'JUL 12' },
    { label: '7月19日', labelEn: 'JUL 19' },
    { label: '7月26日', labelEn: 'JUL 26' },
    { label: '8月2日', labelEn: 'AUG 02' },
    { label: '8月8日', labelEn: 'AUG 08' },
    { label: '8月15日', labelEn: 'AUG 15' },
    { label: '8月22日', labelEn: 'AUG 22' },
    { label: '8月29日', labelEn: 'AUG 29' }
  ];

  const specialEvents = {
    5: {
      title: '金鸽男女单打赛',
      titleEn: 'Golden Dove Singles',
      typeLabel: '男单 · 女单',
      typeLabelEn: 'Men\'s + Women\'s Singles',
      caption: '金鸽男女单打赛活动合影',
      captionEn: 'Golden Dove men\'s and women\'s singles group photo'
    },
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
    },
    15: {
      title: '鸽王争霸赛',
      titleEn: 'Dove King Championship',
      typeLabel: '男单 · 女单',
      typeLabelEn: 'Men\'s + Women\'s Singles',
      caption: '鸽王争霸赛赛后合影',
      captionEn: 'Dove King Championship group photo'
    }
  };

  const moments = Array.from({ length: 15 }, (_, index) => {
    const eventNumber = index + 1;
    const special = specialEvents[eventNumber] || null;
    const photo = photoSlots[eventNumber] || null;
    const eventDate = eventDates[index];
    const paddedNumber = String(eventNumber).padStart(2, '0');
    const title = special ? special.title : '金鸽巡回赛';
    const titleEn = special ? special.titleEn : 'Golden Dove Tour';
    const typeLabel = special ? special.typeLabel : '常驻巡回赛';
    const typeLabelEn = special ? special.typeLabelEn : 'Resident Tour';
    const schedule = '周六 · 17:00–19:00';
    const scheduleEn = 'SATURDAY · 5–7 PM';
    const venue = 'MRTC · 多伦多';
    const venueEn = 'MRTC · Toronto';
    const caption = `EVENT ${paddedNumber} · ${eventDate.label} · ${schedule} · ${venue} · ${special ? special.caption : '金鸽巡回赛活动合影'}`;
    const captionEn = `EVENT ${paddedNumber} · ${eventDate.labelEn} · ${scheduleEn} · ${venueEn} · ${special ? special.captionEn : 'Golden Dove Tour group photo'}`;

    return {
      eventNumber,
      paddedNumber,
      type: special ? 'special' : 'tour',
      typeLabel,
      typeLabelEn,
      title,
      titleEn,
      dateLabel: eventDate.label,
      dateLabelEn: eventDate.labelEn,
      schedule,
      scheduleEn,
      venue,
      venueEn,
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
