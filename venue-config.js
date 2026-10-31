(function initDoveVenues(root) {
  const venues = {
    mrtc: {
      key: 'mrtc',
      shortName: 'MRTC',
      name: 'MRTC',
      schedule: '周六 5–7 PM',
      scheduleEn: 'Saturday · 5–7 PM',
      capacity: 32,
      databasePath: 'doveCupWaitlistSystem/main',
      courtsPath: 'doveCupWaitlistSystem/courtsPage'
    },
    'nyta-east': {
      key: 'nyta-east',
      shortName: 'NYTA East',
      name: 'NYTA East Bubble',
      schedule: '周六 9–11 PM',
      scheduleEn: 'Saturday · 9–11 PM',
      capacity: 12,
      levelCapacity: 4,
      databasePath: 'doveCupWaitlistSystem/venues/nyta-east/main',
      courtsPath: 'doveCupWaitlistSystem/venues/nyta-east/courtsPage'
    }
  };

  function keyFromQuery(search) {
    const requested = new URLSearchParams(String(search || '')).get('venue');
    return Object.hasOwn(venues, requested) ? requested : 'mrtc';
  }

  function get(key) {
    return venues[key] || venues.mrtc;
  }

  function href(page, key, search) {
    const params = new URLSearchParams(String(search || ''));
    params.delete('v');
    params.set('venue', get(key).key);
    const query = params.toString();
    return `${page}${query ? `?${query}` : ''}`;
  }

  const resumeFrom = '2026-11-07';
  function nextSessionDate(now = new Date()) {
    const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const date = new Date(`${local}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (6 - date.getUTCDay() + 7) % 7);
    return [date.toISOString().slice(0, 10), resumeFrom].sort().at(-1);
  }
  root.DoveVenues = { venues, get, href, keyFromQuery, resumeFrom, nextSessionDate };
})(typeof window !== 'undefined' ? window : globalThis);
