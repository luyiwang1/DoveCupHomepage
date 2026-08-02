import test from 'node:test';
import assert from 'node:assert/strict';

await import('../language.js');

const { localizeText } = globalThis.DoveLanguage;

test('translates the team event title into English', () => {
  assert.equal(localizeText('凤凰 vs 狮鹫', 'en'), 'Phoenix vs Griffin');
});

test('translates dynamic match progress into English', () => {
  assert.equal(localizeText('1 / 12 场已完成', 'en'), '1 / 12 matches completed');
});

test('translates dynamic pair and round labels into English', () => {
  assert.equal(localizeText('第 2 轮', 'en'), 'Round 2');
  assert.equal(localizeText('凤凰组合 3', 'en'), 'Phoenix Pair 3');
});

test('translates dynamic court guidance without mixed-language output', () => {
  assert.equal(
    localizeText('第 2 轮结果决定本轮场地', 'en'),
    "Round 2 results determine this round's courts"
  );
});

test('translates English court metadata into Chinese', () => {
  assert.equal(localizeText('4 COURTS', 'zh'), '4 片场地');
  assert.equal(localizeText('Court 3', 'zh'), '场地 3');
});

test('uses complete labels instead of partial mixed translations', () => {
  assert.equal(localizeText('进入报名页', 'en'), 'Registration');
  assert.equal(localizeText('FULL SET WITH AD', 'zh'), '完整一盘 · 占先计分');
});

test('translates signup capacity without changing names that contain gender characters', () => {
  assert.equal(localizeText('男 3/4', 'en'), 'Men 3/4');
  assert.equal(localizeText('女 2/4', 'en'), 'Women 2/4');
  assert.equal(localizeText('小男女', 'en'), '小男女');
});

test('translates automatic pairing feedback', () => {
  assert.equal(
    localizeText('名单尚未满，已先生成现有搭档', 'en'),
    'The roster is incomplete; available pairs were generated'
  );
});

test('translates fixed partner and round deletion confirmations', () => {
  assert.equal(
    localizeText('确定移除固定搭档 Wyman + Linda 吗？两个人会一起退出。', 'en'),
    'Remove fixed partners Wyman + Linda? Both players will leave.'
  );
  assert.equal(
    localizeText('确定删除第 4 轮吗？该轮比分会一起删除，且无法恢复。', 'en'),
    'Delete Round 4? Its scores will also be deleted and cannot be restored.'
  );
});
