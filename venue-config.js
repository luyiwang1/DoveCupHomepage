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

  root.DoveVenues = { venues, get, href, keyFromQuery };
})(typeof window !== 'undefined' ? window : globalThis);
