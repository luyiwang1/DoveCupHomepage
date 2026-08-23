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
  assert.equal(localizeText('进入金鸽巡回赛报名', 'en'), 'Golden Dove Tour Registration');
  assert.equal(localizeText('金鸽巡回赛报名', 'en'), 'Golden Dove Tour Registration');
  assert.equal(localizeText('了解最新活动', 'en'), 'Explore Latest Events');
  assert.equal(localizeText('FULL SET WITH AD', 'zh'), '完整一盘 · 占先计分');
});

test('translates automatic special-event statuses', () => {
  assert.equal(localizeText('即将开始', 'en'), 'Coming Soon');
  assert.equal(localizeText('进行中', 'en'), 'In Progress');
  assert.equal(localizeText('已结束', 'en'), 'Ended');
});

test('translates the past-event summary and empty upcoming state', () => {
  assert.equal(localizeText('新活动筹备中', 'en'), 'A New Event Is in the Works');
  assert.equal(localizeText('往期活动', 'en'), 'Past Events');
  assert.equal(localizeText('16 人参赛', 'en'), '16 Players');
  assert.equal(localizeText('狮鹫 8:4 获胜', 'en'), 'Griffin Won 8-4');
  assert.equal(localizeText('总局数 54:37', 'en'), 'Total Games 54-37');
  assert.equal(localizeText('查看完整赛果', 'en'), 'View Full Results');
});

test('translates the event gallery experience without mixed-language labels', () => {
  assert.equal(localizeText('Dove Cup Moments', 'zh'), '金鸽影集');
  assert.equal(localizeText('Photo Archive', 'zh'), '活动影集');
  assert.equal(localizeText('Event Archive', 'zh'), '活动档案');
  assert.equal(localizeText('活动照片档案', 'en'), 'Event Photo Archive');
  assert.equal(localizeText('现场照片整理中', 'en'), 'Event Photos in Preparation');
  assert.equal(localizeText('查看影集位置', 'en'), 'Open Album');
  assert.equal(localizeText('浏览活动影集', 'en'), 'View Event Album');
  assert.equal(localizeText('6 张活动照片', 'en'), '6 event photos');
  assert.equal(localizeText('1 张活动照片', 'en'), '1 event photo');
  assert.equal(localizeText('活动照片，与赛果一起留下。', 'en'), 'Keep the photos with the final results.');
  assert.equal(
    localizeText('凤凰与狮鹫团体赛选手在 MRTC 室内网球场合影', 'en'),
    'Phoenix and Griffin team-event players posing on an indoor court at MRTC'
  );
});

test('translates the live weekly signup roster on attendance', () => {
  assert.equal(localizeText('本周报名名单', 'en'), 'This Week\'s Registration');
  assert.equal(localizeText('有历史到场记录', 'en'), 'Previous Attendance');
  assert.equal(localizeText('首次报名，待到场', 'en'), 'First Registration · Pending');
  assert.equal(localizeText('本周还没有人报名。', 'en'), 'No one has registered this week yet.');
});

test('translates the recurring Golden Dove Tour activity hub', () => {
  assert.equal(localizeText('金鸽巡回赛', 'en'), 'Golden Dove Tour');
  assert.equal(localizeText('常驻活动 · 金鸽巡回赛', 'en'), 'Recurring Event · Golden Dove Tour');
  assert.equal(localizeText('加入本周名单和候补名单', 'en'), "Join this week's roster or waitlist");
  assert.equal(localizeText('场特殊活动', 'en'), 'Special Event(s)');
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
  assert.equal(localizeText('搭档已互换', 'en'), 'Partners swapped');
  assert.equal(localizeText('待补男球员', 'en'), 'Waiting for Male Player');
});

test('translates special-event archive and attendance messages', () => {
  assert.equal(
    localizeText('活动归档完成，14 位参赛选手已记录到场', 'en'),
    'Event archived. Attendance was recorded for 14 players.'
  );
  assert.equal(
    localizeText('特别活动 · 凤凰 vs 狮鹫：14 人到场', 'en'),
    'Special Event · Phoenix vs Griffin: 14 attendees'
  );
  assert.equal(
    localizeText('活动归档后，参赛名单会保留在这里。', 'en'),
    'Archived special-event rosters will appear here.'
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
  assert.equal(localizeText('基础轮次', 'en'), 'Base Round');
  assert.equal(
    localizeText('前两轮为基础轮次，至少保留两轮', 'en'),
    'The first two are base rounds; keep at least two rounds'
  );
});
