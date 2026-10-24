import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('homepage exposes both venue times and independent signup links before special events', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url),'utf8');
  assert.ok(html.indexOf('<section id="sessions"') < html.indexOf('<section id="events"'));
  for (const venue of ['mrtc','nyta-east']) assert.ok(html.includes(`class="session-link" href="signup.html?venue=${venue}"`));
  assert.ok(html.includes('5:00–7:00 PM'));
  assert.ok(html.includes('9:00–11:00 PM'));
  assert.ok(html.includes('href="#sessions"'));
  assert.ok(html.includes('DoveVenues.nextSessionDate()'));
});
