import assert from 'node:assert/strict';
import test from 'node:test';

await import('../venue-config.js');

const { get, href, keyFromQuery, venues } = globalThis.DoveVenues;

test('defines two independent Saturday tour sessions', () => {
  assert.equal(venues.mrtc.capacity, 32);
  assert.equal(venues.mrtc.schedule, '周六 5–7 PM');
  assert.equal(venues['nyta-east'].capacity, 12);
  assert.equal(venues['nyta-east'].schedule, '周六 9–11 PM');
  assert.notEqual(venues.mrtc.databasePath, venues['nyta-east'].databasePath);
  assert.notEqual(venues.mrtc.courtsPath, venues['nyta-east'].courtsPath);
});

test('defaults old links to MRTC and builds shareable venue links', () => {
  assert.equal(keyFromQuery(''), 'mrtc');
  assert.equal(keyFromQuery('?venue=nyta-east'), 'nyta-east');
  assert.equal(keyFromQuery('?venue=unknown'), 'mrtc');
  assert.equal(get('missing').key, 'mrtc');
  assert.equal(href('signup.html', 'nyta-east', '?lang=en&v=2'), 'signup.html?lang=en&venue=nyta-east');
});
