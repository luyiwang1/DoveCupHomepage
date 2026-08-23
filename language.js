(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DoveLanguage = api;
  if (typeof document !== 'undefined') api.init();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STORAGE_KEY = 'dove_cup_language';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);
  const entries = [];
  const add = (source, zh, en) => entries.push({ source, zh, en });

  // Shared navigation, labels, and mixed-language sports terms.
  add('Golden Dove Cup / 金鸽杯', '金鸽杯', 'Golden Dove Cup');
  add('Golden Dove Cup · Team Special', '金鸽杯 · 团体特别赛', 'Golden Dove Cup · Team Special');
  add('Golden Dove Cup · Singles Championship', '金鸽杯 · 单打冠军赛', 'Golden Dove Cup · Singles Championship');
  add('Golden Dove Cup', '金鸽杯', 'Golden Dove Cup');
  add('金鸽杯', '金鸽杯', 'Golden Dove Cup');
  add('Dove Cup Calendar', '金鸽杯活动日历', 'Dove Cup Calendar');
  add('Dove Cup', '金鸽杯', 'Dove Cup');
  add('About', '关于', 'About');
  add('Events', '活动', 'Events');
  add('Format', '赛制', 'Format');
  add('Join', '参与', 'Join');
  add('Register', '报名', 'Register');
  add('Home', '主页', 'Home');
  add('首页', '首页', 'Home');
  add('活动', '活动', 'Events');
  add('到场', '到场', 'Attendance');
  add('Admin', '管理员', 'Admin');
  add('Admin 已登录', '管理员已登录', 'Admin signed in');
  add('Venue', '场地', 'Venue');
  add('City', '城市', 'City');
  add('Toronto', '多伦多', 'Toronto');
  add('Level', '分级', 'Level');
  add('Tools', '工具', 'Tools');
  add('Waitlist', '候补名单', 'Waitlist');
  add('Court', '场地', 'Court');
  add('Game 比分', '局数比分', 'Game Score');
  add('Total Games', '总局数', 'Total Games');
  add('Team Score', '团队计分', 'Team Score');
  add('Mixed Doubles', '混双', 'Mixed Doubles');
  add('Team Special', '团体特别赛', 'Team Special');
  add('FULL SET WITH AD', '完整一盘 · 占先计分', 'FULL SET WITH AD');
  add('Live Team Result', '实时团队赛果', 'Live Team Result');
  add('Match Rules', '比赛规则', 'Match Rules');
  add('Fixed Partnerships', '固定搭档', 'Fixed Partnerships');
  add('Admin Setup', '管理员设置', 'Admin Setup');
  add('Tournament Desk', '赛事中心', 'Tournament Desk');
  add('Singles Championship', '单打冠军赛', 'Singles Championship');
  add('Court Board', '场地看板', 'Court Board');
  add('Draws', '签表', 'Draws');
  add('Event Archive', '活动档案', 'Event Archive');
  add('Upcoming & Past', '即将举行与往期活动', 'Upcoming & Past');
  add('Special Events', '特别活动', 'Special Events');
  add('Resident Events', '常驻活动', 'Resident Events');
  add('Special Event Series', '特殊活动', 'Special Events');
  add('Schedule', '时间', 'Schedule');
  add('The invitation', '邀请', 'The Invitation');
  add('Cup format', '杯赛赛制', 'Cup Format');
  add('Sign Up', '报名', 'Sign Up');
  add('Golden Sets', '金球赛制', 'Golden Sets');
  add('Dove Attendance', '金鸽到场记录', 'Dove Attendance');
  add('Details', '详情', 'Details');
  add('Vintage Tennis Social', '复古网球社交赛', 'Vintage Tennis Social');
  add('Play with elegance. Compete with warmth. Leave with new partners.', '优雅上场，热情竞争，带着新搭档离开。', 'Play with elegance. Compete with warmth. Leave with new partners.');
  add('Vintage tennis social for the weekend court crowd.', '为周末球场上的朋友而设的复古网球社交赛。', 'Vintage tennis social for the weekend court crowd.');
  add('Toronto tennis events and team specials.', '多伦多网球活动与团体特别赛。', 'Toronto tennis events and team specials.');
  add('MRTC · Toronto · August 08, 2026', 'MRTC · 多伦多 · 2026年8月8日', 'MRTC · Toronto · August 08, 2026');
  add('MRTC · Toronto', 'MRTC · 多伦多', 'MRTC · Toronto');
  add('AUG 08 · SATURDAY', '8月8日 · 周六', 'AUG 08 · SATURDAY');
  add('August 08 · Team Special · MRTC', '8月8日 · 团体特别赛 · MRTC', 'August 08 · Team Special · MRTC');
  add('Team Special · Mixed Doubles', '团体特别赛 · 混双', 'Team Special · Mixed Doubles');
  add('4 Courts · Mixed Doubles · Team Score', '4 片场地 · 混双 · 团队计分', '4 Courts · Mixed Doubles · Team Score');
  add('AUG', '8月', 'AUG');

  // Promotional homepage and activities archive.
  add('金鸽杯活动', '金鸽杯活动', 'Golden Dove Cup Events');
  add('活动中心', '活动中心', 'Events Hub');
  add('常驻活动', '常驻活动', 'Recurring Events');
  add('特殊活动', '特殊活动', 'Special Events');
  add('场常驻活动', '场常驻活动', 'Recurring Event(s)');
  add('场特殊活动', '场特殊活动', 'Special Event(s)');
  add('金鸽巡回赛', '金鸽巡回赛', 'Golden Dove Tour');
  add('常驻活动 · 金鸽巡回赛', '常驻活动 · 金鸽巡回赛', 'Recurring Event · Golden Dove Tour');
  add('金鸽巡回赛 · 报名接龙', '金鸽巡回赛 · 报名接龙', 'Golden Dove Tour · Registration');
  add('金鸽巡回赛 · 三轮升降级赛程', '金鸽巡回赛 · 三轮升降级赛程', 'Golden Dove Tour · Court Rotations');
  add('金鸽巡回赛 · 到场记录', '金鸽巡回赛 · 到场记录', 'Golden Dove Tour · Attendance');
  add('每周持续开放的巡回赛，以及不定期举行的团体赛与主题赛，都集中在这里。', '每周持续开放的巡回赛，以及不定期举行的团体赛与主题赛，都集中在这里。', 'The ongoing weekly tour and occasional team or themed events all live here.');
  add('每周开放的分级升降场巡回赛。四个分级各自进行三轮对局，报名、场地安排和长期到场记录都集中在这里。', '每周开放的分级升降场巡回赛。四个分级各自进行三轮对局，报名、场地安排和长期到场记录都集中在这里。', 'A weekly promotion-and-relegation tour across four divisions. Registration, court assignments, and long-term attendance all live here.');
  add('每周六 · 长期开放', '每周六 · 长期开放', 'Every Saturday · Ongoing');
  add('4 个分级 · 三轮升降级', '4 个分级 · 三轮升降级', '4 Divisions · 3 Promotion/Relegation Rounds');
  add('加入本周名单和候补名单', '加入本周名单和候补名单', 'Join this week\'s roster or waitlist');
  add('查看三轮场地与比分', '查看三轮场地与比分', 'View three-round courts and scores');
  add('查看累计到场次数', '查看累计到场次数', 'View cumulative attendance');
  add('新的常驻活动正在准备中。', '新的常驻活动正在准备中。', 'A new recurring event is being prepared.');
  add('新的特殊活动正在准备中。', '新的特殊活动正在准备中。', 'A new special event is being prepared.');
  add('金鸽杯 Golden Dove Cup', '金鸽杯', 'Golden Dove Cup');
  add('金鸽杯 Golden Dove Cup 是一场复古俱乐部气质的网球社交杯赛。', '金鸽杯是一场具有复古俱乐部气质的网球社交杯赛。', 'Golden Dove Cup is a vintage club-style social tennis tournament.');
  add('一场更有仪式感的周末网球杯赛。复古俱乐部氛围、轻竞技轮转、赛后社交和长期到场记录，给多伦多的网球周末一个漂亮入口。', '一场更有仪式感的周末网球杯赛。复古俱乐部氛围、轻竞技轮转、赛后社交和长期到场记录，给多伦多的网球周末一个漂亮入口。', 'A weekend tennis cup with a sense of occasion: vintage club atmosphere, friendly competition, post-match social time, and long-term attendance records for Toronto players.');
  add('新手场（2.0-） · 2.0-2.5 · 2.5-3.0 · 3.0+', '新手场（2.0-） · 2.0-2.5 · 2.5-3.0 · 3.0+', 'Beginner (under 2.0) · 2.0-2.5 · 2.5-3.0 · 3.0+');
  add('活动 · 报名 · 场地 · 到场', '活动 · 报名 · 场地 · 到场', 'Events · Registration · Courts · Attendance');
  add('三轮升降级', '三轮升降级', 'Three-round promotion and relegation');
  add('进入报名页', '进入报名页', 'Registration');
  add('进入金鸽巡回赛报名', '进入金鸽巡回赛报名', 'Golden Dove Tour Registration');
  add('金鸽巡回赛报名', '金鸽巡回赛报名', 'Golden Dove Tour Registration');
  add('了解最新活动', '了解最新活动', 'Explore Latest Events');
  add('最新活动', '最新活动', 'Latest Event');
  add('赛事入口', '赛事入口', 'Tournament Tools');
  add('报名 / Waitlist', '报名 / 候补名单', 'Registration / Waitlist');
  add('三轮场地分组', '三轮场地分组', 'Three-Round Court Assignments');
  add('每周到场记录', '每周到场记录', 'Weekly Attendance');
  add('特别活动与赛果', '特别活动与赛果', 'Special Events and Results');
  add('场地页面', '场地页面', 'Courts');
  add('巡回赛之外，偶尔来一场特别的。', '巡回赛之外，偶尔来一场特别的。', 'Beyond the weekly tour, something special now and then.');
  add('不只是打一场球，是加入一个周末俱乐部。', '不只是打一场球，是加入一个周末俱乐部。', 'More than a match. Join a weekend tennis club.');
  add('金鸽杯为想认真打球、也想认识同频朋友的人设计。你可以带搭档，也可以单人报名；现场会安排轻竞技轮转、分级对局、合影和赛后交流，让比赛有张力，周末有余韵。', '金鸽杯为想认真打球、也想认识同频朋友的人设计。你可以带搭档，也可以单人报名；现场会安排轻竞技轮转、分级对局、合影和赛后交流，让比赛有张力，周末有余韵。', 'Golden Dove Cup is for people who want serious tennis and good company. Bring a partner or register solo; the day includes friendly rotations, level-based matches, photos, and post-match social time.');
  add('复古一点，讲究一点，也好玩一点。', '复古一点，讲究一点，也好玩一点。', 'A little vintage, a little refined, and a lot of fun.');
  add('报名系统独立运行，支持名额上限、waitlist、付款确认和名单复制。主页只负责介绍，报名页负责行动。', '报名系统独立运行，支持名额上限、候补名单、付款确认和名单复制。主页只负责介绍，报名页负责行动。', 'The registration system handles capacity, waitlist, payment confirmation, and roster copying. The homepage introduces the event; registration happens separately.');
  add('比赛当天进入场地页，读取报名名单，生成三轮升降级赛程。管理员可以调整场地、录入比分。', '比赛当天进入场地页，读取报名名单，生成三轮升降级赛程。管理员可以调整场地、录入比分。', 'On match day, the courts page reads the roster and builds three promotion-and-relegation rounds. Admins can adjust courts and enter scores.');
  add('每周名单归档后自动记录实际到场次数，不计算胜局和积分，长期参加一目了然。', '每周名单归档后自动记录实际到场次数，不计算胜局和积分，长期参加一目了然。', 'Each weekly archive records actual attendance only, without wins or points, so long-term participation stays easy to see.');
  add('主页负责心动，工具页负责办赛。', '主页负责心动，工具页负责办赛。', 'The homepage sets the mood. The tools run the tournament.');
  add('你可以把这个页面发给新朋友看活动质感；真正要报名、排场地、看出勤时，再进入对应工具页。这样宣传和管理分开，观感就不会互相打架。', '你可以把这个页面发给新朋友看活动质感；真正要报名、排场地、看出勤时，再进入对应工具页。这样宣传和管理分开，观感就不会互相打架。', 'Share this page to introduce the event. When it is time to register, assign courts, or check attendance, use the dedicated tools so promotion and administration stay cleanly separated.');
  add('不需要。活动设有新手场（2.0-）、2.0-2.5、2.5-3.0、3.0+ 四个分级，每个分级最多 8 人，核心是有质量地打球和认识新朋友。', '不需要。活动设有新手场（2.0-）、2.0-2.5、2.5-3.0、3.0+ 四个分级，每个分级最多 8 人，核心是有质量地打球和认识新朋友。', 'No. There are four divisions: beginner (under 2.0), 2.0-2.5, 2.5-3.0, and 3.0+, with up to eight players in each. The goal is quality tennis and meeting good people.');
  add('点击“进入金鸽巡回赛报名”会打开独立的报名接龙系统，那里可以报名、进入 waitlist，也能由管理员确认付款。', '点击“进入金鸽巡回赛报名”会打开独立的报名接龙系统，那里可以报名、进入候补名单，也能由管理员确认付款。', 'Select “Golden Dove Tour Registration” to open the separate signup system, where players can register, join the waitlist, and have payment confirmed by an admin.');
  add('场地页面和到场记录是单独工具页，比赛当天使用，不会干扰这个宣传主页的观感。', '场地页面和到场记录是单独工具页，比赛当天使用，不会干扰这个宣传主页的观感。', 'Court assignments and attendance are separate tools used on match day, keeping this promotional homepage focused.');
  add('可以。当前部署在 GitHub Pages，后续可以绑定自定义域名，也可以继续替换日期、地点、价格和社媒链接。', '可以。当前部署在 GitHub Pages，后续可以绑定自定义域名，也可以继续替换日期、地点、价格和社媒链接。', 'Yes. The site is currently on GitHub Pages and can later use a custom domain, with dates, venues, prices, and social links updated anytime.');
  add('需要很强才能参加吗？', '需要很强才能参加吗？', 'Do I need to be an advanced player?');
  add('报名在哪里？', '报名在哪里？', 'Where do I register?');
  add('场地和到场记录在哪里？', '场地和到场记录在哪里？', 'Where are court assignments and attendance?');
  add('之后能接正式域名吗？', '之后能接正式域名吗？', 'Can this use a custom domain later?');
  add('团体赛、主题赛和下一站巡回活动都会保留在这里。每一场比赛结束后，也会成为金鸽杯的赛事档案。', '团体赛、主题赛和下一站巡回活动都会保留在这里。每一场比赛结束后，也会成为金鸽杯的赛事档案。', 'Team competitions, themed events, and future tour stops all live here. After each event, the page becomes part of the Golden Dove Cup archive.');
  add('两支队伍、四片室内场地、固定混双搭档。每一场胜利都为团队带回 1 分。', '两支队伍、四片室内场地、固定混双搭档。每一场胜利都为团队带回 1 分。', 'Two teams, four indoor courts, and fixed mixed-doubles partners. Every match win earns one team point.');
  add('新的特别活动正在准备中。', '新的特别活动正在准备中。', 'A new special event is being prepared.');
  add('Next Special', '下一场特别活动', 'Next Special');
  add('新活动筹备中', '新活动筹备中', 'A New Event Is in the Works');
  add('下一场特殊活动公布后会出现在这里。', '下一场特殊活动公布后会出现在这里。', 'The next special event will appear here when it is announced.');
  add('新活动筹备中，公布后会出现在这里。', '新活动筹备中，公布后会出现在这里。', 'A new event is in the works and will appear here when announced.');
  add('Live & Upcoming', '进行中与即将开始', 'Live & Upcoming');
  add('进行中与即将开始', '进行中与即将开始', 'Live & Upcoming');
  add('Past Events', '往期活动', 'Past Events');
  add('往期活动', '往期活动', 'Past Events');
  add('参赛人数', '参赛人数', 'Players');
  add('团队比分', '团队比分', 'Team Score');
  add('总局数', '总局数', 'Total Games');
  add('16 人参赛', '16 人参赛', '16 Players');
  add('签表', '签表', 'Draws');
  add('男单 + 女单', '男单 + 女单', "Men's + Women's Singles");
  add('赛制', '赛制', 'Competition');
  add('单淘汰', '单淘汰', 'Single Elimination');
  add('查看赛事桌', '查看赛事桌', 'Open Tournament Desk');
  add('狮鹫 8:4 获胜', '狮鹫 8:4 获胜', 'Griffin Won 8-4');
  add('总局数 54:37', '总局数 54:37', 'Total Games 54-37');
  add('查看往期活动', '查看往期活动', 'View Past Events');
  add('查看完整赛果', '查看完整赛果', 'View Full Results');
  add('还没有往期活动。', '还没有往期活动。', 'There are no past events yet.');
  add('即将开始', '即将开始', 'Coming Soon');
  add('进行中', '进行中', 'In Progress');
  add('已结束', '已结束', 'Ended');
  add('查看全部活动', '查看全部活动', 'View All Events');
  add('进入活动页面', '进入活动页面', 'Open Event');
  add('查看活动', '查看活动', 'View Event');
  add('返回主页', '返回主页', 'Back to Home');
  add('AUG 23 · SUNDAY', '8月23日 · 周日', 'AUG 23 · SUNDAY');
  add('男单、女单各 8 人独立接龙，姓名实时同步到单淘汰签表；现场选择场地、录入比分后自动推进胜者。', '男单、女单各 8 人独立接龙，姓名实时同步到单淘汰签表；现场选择场地、录入比分后自动推进胜者。', 'Separate eight-player men\'s and women\'s signups sync live to the single-elimination draws; admins assign courts, record scores, and advance winners automatically.');
  add('6 Courts · Men + Women Singles · Rolling Tournament', '6 片场地 · 男单 + 女单 · 滚动赛程', '6 Courts · Men + Women Singles · Rolling Tournament');
  add('Golden Dove Cup Singles Championship tournament desk for rolling men\'s and women\'s single-elimination draws.', '金鸽杯单打冠军赛现场赛事桌，用于男女单打单淘汰滚动签表。', 'Golden Dove Cup Singles Championship tournament desk for rolling men\'s and women\'s single-elimination draws.');
  add('A rolling tournament desk for 8 men and 8 women, two independent single-elimination draws, six courts, and a two-hour event window.', '现场赛事桌：8 名男子、8 名女子，男女独立单淘汰签表，6 片场地，2 小时活动窗口。', 'A rolling tournament desk for 8 men and 8 women, two independent single-elimination draws, six courts, and a two-hour event window.');
  add('8 Men + 8 Women', '8 男 + 8 女', '8 Men + 8 Women');
  add('6 Courts', '6 片场地', '6 Courts');
  add('35 Min / Match', '每场 35 分钟', '35 Min / Match');
  add('Rolling Tournament', '滚动开赛', 'Rolling Tournament');
  add('Open Court Board', '打开场地看板', 'Open Court Board');
  add('View Draws', '查看签表', 'View Draws');
  add('Back to Events', '返回活动中心', 'Back to Events');
  add('Signup', '报名', 'Signup');
  add('Join the Signup', '接龙报名', 'Join the Signup');
  add('Singles Signup', '单打接龙报名', 'Singles Signup');
  add('Join the Singles Championship.', '报名单打冠军赛。', 'Join the Singles Championship.');
  add('Name / WeChat Name', '姓名 / 微信名', 'Name / WeChat Name');
  add('Division', '组别', 'Division');
  add('Registration Open', '报名开放中', 'Registration Open');
  add('Registration Closed', '报名已锁定', 'Registration Closed');
  add('Men\'s Singles', '男单', 'Men\'s Singles');
  add('Women\'s Singles', '女单', 'Women\'s Singles');
  add('Eight spots are available in each draw. Your name appears on the court board and draw immediately.', '男单、女单各有 8 个席位；报名后姓名会立即同步到签表。', 'Eight spots are available in each draw. Your name appears on the draw immediately.');
  add('Registration is locked. The published roster and draw remain live below.', '报名已经锁定，已公布的名单和签表会继续实时显示。', 'Registration is locked. The published roster and draw remain live below.');
  add('Signup List', '接龙名单', 'Signup List');
  add('Open Slot', '空位', 'Open Slot');
  add('Close Registration', '锁定报名', 'Close Registration');
  add('Reopen Registration', '重新开放报名', 'Reopen Registration');
  add('Signup confirmed', '报名成功', 'Signup confirmed');
  add('Registration removed', '已取消报名', 'Registration removed');
  add('Remove this registration?', '确定取消这条报名吗？', 'Remove this registration?');
  add('Remove Registration', '取消报名', 'Remove Registration');
  add('Registration is closed', '报名已经锁定', 'Registration is closed');
  add('Choose a division', '请选择男单或女单', 'Choose a division');
  add('Enter your name', '请输入姓名', 'Enter your name');
  add('This name is already registered', '这个名字已经报名', 'This name is already registered');
  add('This division is full', '这个组别已经满员', 'This division is full');
  add('Unable to join the signup', '暂时无法报名，请刷新后重试', 'Unable to join the signup');
  add('Unable to remove this registration', '暂时无法取消报名', 'Unable to remove this registration');
  add('Registration reopened', '报名已重新开放', 'Registration reopened');
  add('Registration closed', '报名已锁定', 'Registration closed');
  add('Registration cannot reopen after matches start', '比赛开始后不能重新开放报名', 'Registration cannot reopen after matches start');
  add('Unable to close registration', '暂时无法锁定报名', 'Unable to close registration');
  add('Tournament Rules', '赛事规则', 'Tournament Rules');
  add('Six courts. One draw. Play your way to the title.', '六片球场，同时开拍。一路赢到冠军。', 'Six courts. One draw. Play your way to the title.');
  add('Main-draw matches always have court priority. Eliminated players may free play on idle courts until the next official match is ready.', '正赛永远优先使用场地。淘汰球员可以在暂时空闲的场地自由打，直到下一场正赛准备好。', 'Main-draw matches always have court priority. Eliminated players may free play on idle courts until the next official match is ready.');
  add('Opening Courts', '开场场地', 'Opening Courts');
  add('Begin with three men\'s QFs and three women\'s QFs. The remaining men\'s QF and women\'s QF start as soon as any court opens.', '开场先打 3 场男单四分之一决赛和 3 场女单四分之一决赛。剩余两场在任意场地空出后立即补上。', 'Begin with three men\'s QFs and three women\'s QFs. The remaining men\'s QF and women\'s QF start as soon as any court opens.');
  add('Rolling Starts', '滚动开赛', 'Rolling Starts');
  add('Semifinals and finals start immediately when both players are ready and a court is available. No round-wide waiting.', '半决赛和决赛只要双方就绪且有场地就立刻开打，不等待统一轮次。', 'Semifinals and finals start immediately when both players are ready and a court is available. No round-wide waiting.');
  add('Scoring', '计分', 'Scoring');
  add('Normal 15/30/40 scoring. First to 6 games wins; at 5-5, play a 7-point tiebreak.', '正常 15/30/40 计分。先到 6 局获胜；5-5 时直接打 7 分抢七。', 'Normal 15/30/40 scoring. First to 6 games wins; at 5-5, play a 7-point tiebreak.');
  add('Time Cap', '时间上限', 'Time Cap');
  add('At 35 minutes, finish the current game. More games wins; if games are tied, play a 7-point tiebreak.', '35 分钟到时打完当前局。局数领先者获胜；局数相同则打 7 分抢七。', 'At 35 minutes, finish the current game. More games wins; if games are tied, play a 7-point tiebreak.');
  add('Live Court Board', '实时场地看板', 'Live Court Board');
  add('Six courts, one clear desk view.', '6 片场地，一眼看清现场。', 'Six courts, one clear desk view.');
  add('Copy Desk Summary', '复制现场摘要', 'Copy Desk Summary');
  add('Reset Tournament', '重置赛事', 'Reset Tournament');
  add('Loading live desk...', '正在读取现场赛事桌...', 'Loading live desk...');
  add('Next Official Matches', '下一批正赛', 'Next Official Matches');
  add('Desk Notes', '赛事桌提示', 'Desk Notes');
  add('Assign a court, start the match, then record games and winner. Once a QF or SF is finished, the next match automatically becomes Ready.', '分配场地、开始比赛，然后录入局数和胜者。四分之一决赛或半决赛完成后，下一场会自动进入已准备状态。', 'Assign a court, start the match, then record games and winner. Once a QF or SF is finished, the next match automatically becomes Ready.');
  add('Names save live after editing.', '修改姓名后会实时保存。', 'Names save live after editing.');
  add('Men\'s Draw and Women\'s Draw', '男单签表与女单签表', 'Men\'s Draw and Women\'s Draw');
  add('Each draw is independent: QF, SF, Final. There is no third-place match or formal ranking after elimination.', '男女签表互相独立，依次进行四分之一决赛、半决赛和决赛。淘汰后不安排正式季军赛或排名赛。', 'Each draw is independent: QF, SF, Final. There is no third-place match or formal ranking after elimination.');
  add('Men\'s Draw', '男单签表', 'Men\'s Draw');
  add('Women\'s Draw', '女单签表', 'Women\'s Draw');
  add('Men Singles', '男单', 'Men Singles');
  add('Women Singles', '女单', 'Women Singles');
  add('Quarterfinals', '四分之一决赛', 'Quarterfinals');
  add('Semifinals', '半决赛', 'Semifinals');
  add('Final', '决赛', 'Final');
  add('Finished', '已完成', 'Finished');
  add('Playing', '比赛中', 'Playing');
  add('Ready', '已准备', 'Ready');
  add('Waiting', '等待中', 'Waiting');
  add('Champions', '冠军', 'Champions');
  add('Pending', '待定', 'Pending');
  add('TBD', '待定', 'TBD');
  add('Free Play', '自由打', 'Free Play');
  add('Official matches take priority when ready.', '下一场正赛准备好后需要让出场地。', 'Official matches take priority when ready.');
  add('No unassigned Ready matches.', '没有已准备但尚未分配场地的比赛。', 'No unassigned Ready matches.');
  add('Live synced', '实时已同步', 'Live synced');
  add('Live saved', '实时已保存', 'Live saved');
  add('Saved locally', '已保存到本机', 'Saved locally');
  add('Saving...', '正在保存...', 'Saving...');
  add('Save failed', '保存失败', 'Save failed');
  add('Save failed. Check your connection.', '保存失败，请检查网络连接。', 'Save failed. Check your connection.');
  add('Firebase unavailable; using local view', '云端服务不可用，当前使用本机数据', 'Firebase unavailable; using local view');
  add('Live data read failed', '实时数据读取失败', 'Live data read failed');
  add('Admin signed in', '管理员已登录', 'Admin signed in');
  add('Admin Login', '管理员登录', 'Admin Login');
  add('Password', '密码', 'Password');
  add('Sign In', '登录', 'Sign In');
  add('Cancel', '取消', 'Cancel');
  add('Only an admin can edit the tournament desk', '只有管理员可以编辑赛事桌', 'Only an admin can edit the tournament desk');
  add('Enter admin password', '请输入管理员密码', 'Enter admin password');
  add('Wrong password', '密码错误', 'Wrong password');
  add('Reset players, courts, statuses, and scores for this Singles Championship?', '确定重置本场单打冠军赛的选手、场地、状态和比分吗？', 'Reset players, courts, statuses, and scores for this Singles Championship?');
  add('Tournament reset', '赛事已重置', 'Tournament reset');
  add('Status', '状态', 'Status');
  add('Games', '局数', 'Games');
  add('Tiebreak', '抢七', 'Tiebreak');
  add('Winner', '胜者', 'Winner');
  add('Choose', '选择', 'Choose');
  add('Unassigned', '未分配', 'Unassigned');
  add('Start', '开始', 'Start');
  add('Finish & Advance', '完成并晋级', 'Finish & Advance');
  add('Edit Match', '编辑比赛', 'Edit Match');
  add('Match Editor', '比赛编辑', 'Match Editor');
  add('Close', '关闭', 'Close');
  add('Copy failed', '复制失败', 'Copy failed');
  add('Players', '选手', 'Players');
  add('Court updated', '场地已更新', 'Court updated');
  add('Status updated', '状态已更新', 'Status updated');
  add('Player updated', '选手已更新', 'Player updated');
  add('Match started', '比赛已开始', 'Match started');
  add('Winner advanced', '胜者已晋级', 'Winner advanced');
  add('Choose a winner', '请选择胜者', 'Choose a winner');
  add('Assign a court first', '请先分配场地', 'Assign a court first');
  add('Both players are not ready yet', '双方选手尚未就绪', 'Both players are not ready yet');
  add('Desk summary copied', '现场摘要已复制', 'Desk summary copied');
  add('Singles Championship tournament desk.', '单打冠军赛现场赛事桌。', 'Singles Championship tournament desk.');
  add('Dove Cup Moments', '金鸽影集', 'Dove Cup Moments');
  add('Photo Archive', '活动影集', 'Photo Archive');
  add('Event Archive', '活动档案', 'Event Archive');
  add('活动照片档案', '活动照片档案', 'Event Photo Archive');
  add('活动影集', '活动影集', 'Event Album');
  add('现场照片整理中', '现场照片整理中', 'Event Photos in Preparation');
  add('查看影集位置', '查看影集位置', 'Open Album');
  add('浏览活动影集', '浏览活动影集', 'View Event Album');
  add('活动照片，与赛果一起留下。', '活动照片，与赛果一起留下。', 'Keep the photos with the final results.');
  add('每场特别活动都会保留自己的影集。照片上传后，可以在这里逐张浏览，并与名单、固定搭档和完整比分一起长期保存。', '每场特别活动都会保留自己的影集。照片上传后，可以在这里逐张浏览，并与名单、固定搭档和完整比分一起长期保存。', 'Every special event keeps its own album. Once uploaded, the photos can be viewed here and preserved with the roster, fixed partnerships, and full scores.');
  add('金鸽杯复古网球场品牌视觉', '金鸽杯复古网球场品牌视觉', 'Golden Dove Cup vintage tennis court brand visual');
  add('凤凰与狮鹫团体赛选手在 MRTC 室内网球场合影', '凤凰与狮鹫团体赛选手在 MRTC 室内网球场合影', 'Phoenix and Griffin team-event players posing on an indoor court at MRTC');

  // Team event page.
  add('8.8 混双团体赛 · 金鸽杯', '8.8 混双团体赛 · 金鸽杯', 'Aug 8 Mixed Doubles Team Event · Golden Dove Cup');
  add('Team Signup', '团体赛接龙', 'Team Signup');
  add('Admin Pairing', '管理员配对', 'Admin Pairing');
  add('像接龙一样加入团体赛。', '像接龙一样加入团体赛。', 'Join the team event like a signup chain.');
  add('＋ 接龙报名', '＋ 接龙报名', '＋ Join the Signup');
  add('接龙报名', '接龙报名', 'Join the Signup');
  add('输入一次姓名，选择性别与队伍即可。每队 4 男 4 女；选择“自动分配”时，系统会优先补到人数较少的一队。', '输入一次姓名，选择性别与队伍即可。每队 4 男 4 女；选择“自动分配”时，系统会优先补到人数较少的一队。', 'Enter your name once, then choose a gender and team. Each team has four men and four women; automatic assignment fills the team with fewer players first.');
  add('可以单人报名，也可以两人一起锁定为固定搭档。系统会平衡人数并随机分队；固定搭档始终同队、全程不拆分。', '可以单人报名，也可以两人一起锁定为固定搭档。系统会平衡人数并随机分队；固定搭档始终同队、全程不拆分。', 'Register solo or lock in with a fixed partner. The system balances and randomizes teams; fixed partners always stay together.');
  add('从接龙名单直接生成搭档。', '从接龙名单直接生成搭档。', 'Create fixed partners directly from the signup list.');
  add('自动生成 8 组混双', '自动生成 8 组混双', 'Generate 8 Mixed Pairs');
  add('系统按报名顺序将每队男、女球员配成四组。管理员也可以用下拉菜单调整搭档并选择队长，不需要重复输入姓名。', '系统按报名顺序将每队男、女球员配成四组。管理员也可以用下拉菜单调整搭档并选择队长，不需要重复输入姓名。', 'The system pairs each team’s men and women in signup order. Admins can adjust partners and select captains from dropdowns without retyping names.');
  add('固定搭档会优先生成并锁定；剩余单人球员再配成混双。管理员只能调整未锁定的组合，并可以从名单中选择队长。', '固定搭档会优先生成并锁定；剩余单人球员再配成混双。管理员只能调整未锁定的组合，并可以从名单中选择队长。', 'Fixed partners are generated and locked first; remaining solo players are then paired. Admins can adjust only unlocked pairs and select captains from the roster.');
  add('固定搭档会优先生成并锁定。拖动未锁定球员即可互换搭档；手机上也可以依次点选两个同队、同性别位置。', '固定搭档会优先生成并锁定。拖动未锁定球员即可互换搭档；手机上也可以依次点选两个同队、同性别位置。', 'Fixed partners are generated and locked first. Drag unlocked players to swap partners; on mobile, tap two slots on the same team and of the same gender.');
  add('团体赛接龙', '团体赛接龙', 'Team Event Signup');
  add('姓名 / 微信名', '姓名 / 微信名', 'Name / WeChat Name');
  add('报名方式', '报名方式', 'Signup Mode');
  add('单人报名', '单人报名', 'Solo Signup');
  add('固定搭档报名', '固定搭档报名', 'Fixed Partner Signup');
  add('性别', '性别', 'Gender');
  add('队伍', '队伍', 'Team');
  add('自动分配', '自动分配', 'Auto Assign');
  add('加入接龙', '加入接龙', 'Join Signup');
  add('每支队伍最多 4 男 4 女。你可以删除自己在本设备上的报名；管理员可以管理全部名单。', '每支队伍最多 4 男 4 女。你可以删除自己在本设备上的报名；管理员可以管理全部名单。', 'Each team allows up to four men and four women. You can remove your own signup on this device; admins can manage the full list.');
  add('男球员姓名', '男球员姓名', 'Male Player Name');
  add('女球员姓名', '女球员姓名', 'Female Player Name');
  add('输入男球员姓名', '输入男球员姓名', 'Enter male player name');
  add('输入女球员姓名', '输入女球员姓名', 'Enter female player name');
  add('组合名称（可选）', '组合名称（可选）', 'Pair Name (Optional)');
  add('例如：啊对对队', '例如：啊对对队', 'Example: Ace Duo');
  add('系统会平衡人数并随机分配凤凰或狮鹫。固定搭档一定进入同一队，并在所有轮次保持同一组合。', '系统会平衡人数并随机分配凤凰或狮鹫。固定搭档一定进入同一队，并在所有轮次保持同一组合。', 'The system balances and randomizes Phoenix or Griffin. Fixed partners always join the same team and remain paired in every round.');
  add('每支队伍最多 4 男 4 女。固定搭档按整组加入或退出；管理员可以管理全部名单。', '每支队伍最多 4 男 4 女。固定搭档按整组加入或退出；管理员可以管理全部名单。', 'Each team allows up to four men and four women. Fixed partners join or leave together; admins can manage the full list.');
  add('固定搭档', '固定搭档', 'Fixed Pair');
  add('固定', '固定', 'Locked');
  add('选择男球员', '选择男球员', 'Select Male Player');
  add('选择女球员', '选择女球员', 'Select Female Player');
  add('男球员', '男球员', 'Male Player');
  add('女球员', '女球员', 'Female Player');
  add('男球员位置', '男球员位置', 'Male Player Slot');
  add('女球员位置', '女球员位置', 'Female Player Slot');
  add('待补男球员', '待补男球员', 'Waiting for Male Player');
  add('待补女球员', '待补女球员', 'Waiting for Female Player');
  add('拖拽互换搭档', '拖拽互换搭档', 'Drag to Swap Partners');
  add('只能互换同队同性别球员', '只能互换同队同性别球员', 'Only same-team players of the same gender can be swapped');
  add('搭档已互换', '搭档已互换', 'Partners swapped');
  add('活动档案已锁定', '活动档案已锁定', 'Event Archive Locked');
  add('名单、搭档、轮次与赛果已永久保留。', '名单、搭档、轮次与赛果已永久保留。', 'The roster, pairs, rounds, and results are permanently preserved.');
  add('查看到场记录', '查看到场记录', 'View Attendance');
  add('归档活动并记录到场', '归档活动并记录到场', 'Archive Event and Record Attendance');
  add('活动当天开放归档', '活动当天开放归档', 'Archive Available on Event Day');
  add('活动当天才可以归档', '活动当天才可以归档', 'The event can be archived on event day');
  add('活动已归档', '活动已归档', 'Event Archived');
  add('已归档', '已归档', 'Archived');
  add('活动档案只读', '活动档案只读', 'Event Archive · Read Only');
  add('活动已归档，数据只读', '活动已归档，数据只读', 'This event is archived and read only');
  add('活动已经归档', '活动已经归档', 'This event is already archived');
  add('当前参赛名单为空，无法归档', '当前参赛名单为空，无法归档', 'The event cannot be archived because the roster is empty');
  add('正在归档活动', '正在归档活动', 'Archiving event');
  add('归档失败', '归档失败', 'Archive Failed');
  add('活动归档失败，请检查网络', '活动归档失败，请检查网络', 'Event archive failed. Check your connection.');
  add('归档没有完成', '归档没有完成', 'Archive Not Completed');
  add('活动归档没有完成', '活动归档没有完成', 'The event archive was not completed');
  add('男', '男', 'Male');
  add('女', '女', 'Female');
  add('还没有人接龙', '还没有人接龙', 'No signups yet');
  add('删除报名', '删除报名', 'Remove Signup');
  add('关闭', '关闭', 'Close');
  add('请选择性别', '请选择性别', 'Select a gender');
  add('这个名字已经接龙', '这个名字已经接龙', 'This name is already registered');
  add('这个组别已经报满', '这个组别已经报满', 'This team group is full');
  add('请输入两位固定搭档的姓名', '请输入两位固定搭档的姓名', 'Enter both fixed partners');
  add('固定搭档不能使用相同姓名', '固定搭档不能使用相同姓名', 'Fixed partners must use different names');
  add('其中一个名字已经接龙', '其中一个名字已经接龙', 'One of these names is already registered');
  add('目前没有队伍能同时容纳这组固定搭档', '目前没有队伍能同时容纳这组固定搭档', 'Neither team currently has room for both fixed partners');
  add('这个性别组别已经报满', '这个性别组别已经报满', 'This gender group is full');
  add('固定搭档不能拆分', '固定搭档不能拆分', 'Fixed partners cannot be separated');
  add('报名保存失败，请检查网络', '报名保存失败，请检查网络', 'Signup failed. Check your connection.');
  add('报名没有保存', '报名没有保存', 'Signup was not saved');
  add('已加入团体赛', '已加入团体赛', 'joined the team event');
  add('的团体赛报名吗？', '的团体赛报名吗？', 'from the team event?');
  add('移除失败，请检查网络', '移除失败，请检查网络', 'Removal failed. Check your connection.');
  add('已移除', '已移除', 'removed');
  add('已按接龙顺序生成固定混双', '已按接龙顺序生成固定混双', 'Fixed mixed pairs generated in signup order');
  add('已按接龙顺序生成 8 组固定混双', '已按接龙顺序生成 8 组固定混双', 'Eight fixed mixed pairs generated in signup order');
  add('名单尚未满，已先生成现有搭档', '名单尚未满，已先生成现有搭档', 'The roster is incomplete; available pairs were generated');
  add('正在生成搭档', '正在生成搭档', 'Generating pairs');
  add('自动生成搭档失败，请检查网络', '自动生成搭档失败，请检查网络', 'Automatic pairing failed. Check your connection.');
  add('删除轮次', '删除轮次', 'Delete Round');
  add('至少保留一个轮次', '至少保留一个轮次', 'Keep at least one round');
  add('基础轮次', '基础轮次', 'Base Round');
  add('前两轮为基础轮次，至少保留两轮', '前两轮为基础轮次，至少保留两轮', 'The first two are base rounds; keep at least two rounds');
  add('轮次已删除', '轮次已删除', 'Round deleted');
  add('该轮比分会一起删除，且无法恢复。', '该轮比分会一起删除，且无法恢复。', 'Its scores will also be deleted and cannot be restored.');
  add('Game', '局', 'Game');
  add('VS', '对阵', 'VS');
  add('金鸽杯 8 月 8 日凤凰与狮鹫混双团体赛，实时阵容、比分和团队结果。', '金鸽杯 8 月 8 日凤凰与狮鹫混双团体赛，实时阵容、比分和团队结果。', 'Golden Dove Cup mixed doubles team event on August 8, with live lineups, scores, and team results.');
  add('凤凰 vs 狮鹫', '凤凰 对阵 狮鹫', 'Phoenix vs Griffin');
  add('凤凰 Phoenix', '凤凰', 'Phoenix');
  add('狮鹫 Griffin', '狮鹫', 'Griffin');
  add('凤凰固定搭档', '凤凰固定搭档', 'Phoenix Fixed Pair');
  add('狮鹫固定搭档', '狮鹫固定搭档', 'Griffin Fixed Pair');
  add('凤凰 game 数', '凤凰局数', 'Phoenix games');
  add('狮鹫 game 数', '狮鹫局数', 'Griffin games');
  add('四片室内场地同时开赛。八组固定混双以团队之名出战，每一场胜利都将为队伍带回 1 分。', '四片室内场地同时开赛。八组固定混双以团队之名出战，每一场胜利都将为队伍带回 1 分。', 'Four indoor courts start together. Eight fixed mixed-doubles pairs compete for their teams, and every match win earns one point.');
  add('每一局都算数，每一场都为了团队。', '每一局都算数，每一场都为了团队。', 'Every game counts. Every match is for the team.');
  add('四组固定混双每轮全部上场。队长决定每轮的出战顺序和 Court 安排，搭档在整场活动中保持不变。', '四组固定混双每轮全部上场。队长决定每轮的出战顺序和场地安排，搭档在整场活动中保持不变。', 'All four fixed mixed-doubles pairs play every round. Captains choose the order and court assignments, while partners remain fixed throughout the event.');
  add('完整一盘', '完整一盘', 'Full Set');
  add('正常一盘先到 6 个 game，采用 Advantage scoring，有 AD。5-5 时直接进行 7 分抢七。', '正常一盘先到 6 局，采用占先计分。5-5 时直接进行 7 分抢七。', 'Play one full set to six games with advantage scoring. At 5-5, play a seven-point tiebreak.');
  add('35 分钟', '35 分钟', '35 Minutes');
  add('每场限时 35 分钟。时间到时按已完成 game 的局数领先者获胜；提前结束可以自由活动。', '每场限时 35 分钟。时间到时按已完成局数的领先者获胜；提前结束可以自由活动。', 'Each match is capped at 35 minutes. At time, the team leading in completed games wins; early finishers have free court time.');
  add('一场一分', '一场一分', 'One Point per Match');
  add('每一场混双胜方所属队伍获得 1 个团队积分。局数相同的场次由赛事负责人指定决胜方。', '每一场混双胜方所属队伍获得 1 个团队积分。局数相同的场次由赛事负责人指定决胜方。', 'The winning pair earns one point for its team. If the game score is tied at time, the tournament director selects the match winner.');
  add('决定冠军', '决定冠军', 'Deciding the Champion');
  add('全部比赛结束后先比较团队积分；团队积分相同，再比较两队累计赢得的总 game 数。', '全部比赛结束后先比较团队积分；团队积分相同，再比较两队累计赢得的总局数。', 'After all matches, compare team points first. If tied, compare total games won.');
  add('两支队伍，八组固定混双。', '两支队伍，八组固定混双。', 'Two teams. Eight fixed mixed-doubles pairs.');
  add('每位球员每轮都会上场。队长负责决定组合在四片场地上的顺序，而不是决定谁休息。', '每位球员每轮都会上场。队长负责决定组合在四片场地上的顺序，而不是决定谁休息。', 'Every player competes in every round. Captains decide the order across four courts; no one sits out.');
  add('录入队长与固定搭档。', '录入队长与固定搭档。', 'Enter captains and fixed partners.');
  add('姓名修改后会实时同步到所有人的页面，并自动更新下方每一轮的出战选择。', '姓名修改后会实时同步到所有人的页面，并自动更新下方每一轮的出战选择。', 'Name changes sync live for everyone and update each round lineup below.');
  add('录入说明：抢七获胜请把最终局数记为 6-5。35 分钟结束时若局数不同，系统自动判定领先方；若局数相同，请在“同局决胜方”中选择现场获胜队伍。未填完的比赛不会计入团队积分。', '录入说明：抢七获胜请把最终局数记为 6-5。35 分钟结束时若局数不同，系统自动判定领先方；若局数相同，请在“同局决胜方”中选择现场获胜队伍。未填完的比赛不会计入团队积分。', 'Scoring: record a tiebreak win as 6-5. At 35 minutes, the system awards a game-score leader automatically. If games are tied, select the on-site winner under “Tied-score winner.” Incomplete matches do not count.');
  add('团队总比分', '团队总比分', 'Overall Team Score');
  add('团队积分', '团队积分', 'Team Points');
  add('比赛成绩与胜负', '比赛成绩与胜负', 'Match Scores and Results');
  add('查看实时赛果', '查看实时赛果', 'View Live Results');
  add('比赛规则', '比赛规则', 'Rules');
  add('全部活动', '全部活动', 'All Events');
  add('主页', '主页', 'Home');
  add('新增轮次', '新增轮次', 'Add Round');
  add('清空比分', '清空比分', 'Clear Scores');
  add('队长 ·', '队长 ·', 'Captain ·');
  add('队长', '队长', 'Captain');
  add('待选举', '待选举', 'To Be Elected');
  add('输入队长姓名', '输入队长姓名', 'Enter captain name');
  add('球员 A', '球员 A', 'Player A');
  add('球员 B', '球员 B', 'Player B');
  add('同局决胜方', '同局决胜方', 'Tied-score Winner');
  add('本场结果', '本场结果', 'Match Result');
  add('自动判定', '自动判定', 'Automatic');
  add('等待决胜', '等待决胜', 'Winner Needed');
  add('待录入', '待录入', 'Pending');
  add('比赛进行中', '比赛进行中', 'Matches in Progress');
  add('等待比赛开始', '等待比赛开始', 'Waiting to Start');
  add('完全打平', '完全打平', 'Overall Tie');
  add('以团队积分胜出', '以团队积分胜出', 'Won on team points');
  add('团队积分相同，以总 game 数胜出', '团队积分相同，以总局数胜出', 'Team points tied; won on total games');
  add('团队积分及总 game 数均相同，需要加赛', '团队积分及总局数均相同，需要加赛', 'Team points and total games are tied; a playoff is required');
  add('阵容有重复或遗漏', '阵容有重复或遗漏', 'lineup has a duplicate or missing pair');
  add('实时数据库尚未连接', '实时数据库尚未连接', 'Live database is not connected');
  add('正在连接实时数据', '正在连接实时数据', 'Connecting to live data');
  add('实时同步中', '实时同步中', 'Live Sync');
  add('正在保存', '正在保存', 'Saving');
  add('已实时保存', '已实时保存', 'Saved Live');
  add('保存失败，请检查网络', '保存失败，请检查网络', 'Save failed. Check your connection.');
  add('实时数据读取失败', '实时数据读取失败', 'Unable to read live data');
  add('Firebase 加载失败', 'Firebase 加载失败', 'Firebase failed to load');
  add('确定清空所有轮次的比分吗？固定搭档和出战顺序会保留。', '确定清空所有轮次的比分吗？固定搭档和出战顺序会保留。', 'Clear all round scores? Fixed partners and lineup order will be kept.');
  add('请输入管理员密码', '请输入管理员密码', 'Enter the admin password');
  add('密码错误', '密码错误', 'Incorrect password');

  // Registration page.
  add('金鸽杯报名接龙', '金鸽杯报名接龙', 'Golden Dove Cup Registration');
  add('活动接龙', '活动接龙', 'Event Registration');
  add('报名接龙', '报名接龙', 'Registration');
  add('✏️ 改名', '✏️ 改名', '✏️ Rename');
  add('名额', '名额', 'Capacity');
  add('已报名', '已报名', 'Registered');
  add('已付', '已付', 'Paid');
  add('报名', '报名', 'Register');
  add('汇总', '汇总', 'Summary');
  add('名额占用', '名额占用', 'Capacity Used');
  add('总名额上限', '总名额上限', 'Total Capacity');
  add('设置', '设置', 'Set');
  add('报名表每周六 19:00（多伦多时间）归档并更新为空。', '报名表每周六 19:00（多伦多时间）归档并更新为空。', 'The registration form archives and resets every Saturday at 7:00 PM Toronto time.');
  add('报名列表', '报名列表', 'Registration List');
  add('📊 报名概况', '📊 报名概况', '📊 Registration Summary');
  add('报名概况', '报名概况', 'Registration Summary');
  add('已付款', '已付款', 'Paid');
  add('未付款', '未付款', 'Unpaid');
  add('⏳ 未付款名单', '⏳ 未付款名单', '⏳ Unpaid Players');
  add('未付款名单', '未付款名单', 'Unpaid Players');
  add('报名历史 · 仅管理员', '报名历史 · 仅管理员', 'Registration History · Admin Only');
  add('正在同步历史数据…', '正在同步历史数据…', 'Syncing history…');
  add('📋 复制接龙文本', '📋 复制接龙文本', '📋 Copy Registration List');
  add('➕ 添加人员', '➕ 添加人员', '➕ Add Player');
  add('添加人员', '添加人员', 'Add Player');
  add('新手场 · 2.0-', '新手场 · 2.0-', 'Beginner · Under 2.0');
  add('取消', '取消', 'Cancel');
  add('加 Waitlist', '加入候补名单', 'Join Waitlist');
  add('直接报名', '直接报名', 'Register Now');
  add('✏️ 修改活动名称', '✏️ 修改活动名称', '✏️ Edit Event Name');
  add('修改活动名称', '修改活动名称', 'Edit Event Name');
  add('保存', '保存', 'Save');
  add('姓名 / 微信名', '姓名 / 微信名', 'Name / WeChat Name');
  add('姓名', '姓名', 'Name');
  add('微信名', '微信名', 'WeChat Name');
  add('输入姓名', '输入姓名', 'Enter name');
  add('例：5月羽毛球活动', '例：5月羽毛球活动', 'Example: May Tennis Event');
  add('不限', '不限', 'No Limit');
  add('全部', '全部', 'All');
  add('未录入', '未录入', 'Not Entered');
  add('已确认', '已确认', 'Confirmed');
  add('已确认参加', '已确认参加', 'Confirmed');
  add('待确认', '待确认', 'Pending Confirmation');
  add('排队中', '排队中', 'Waiting');
  add('未付款', '未付款', 'Unpaid');
  add('标记未付款', '标记未付款', 'Mark Unpaid');
  add('取消确认', '取消确认', 'Undo Confirmation');
  add('补位', '补位', 'Promote');
  add('这是你', '这是你', 'You');
  add('暂无报名', '暂无报名', 'No Registrations');
  add('还没有人报名', '还没有人报名', 'No one has registered yet');
  add('点击右下角 + 添加', '点击右下角 + 添加', 'Use the + button to add a player');
  add('还没有可统计的报名记录。', '还没有可统计的报名记录。', 'No registration history is available yet.');
  add('第一次周六归档后，历史名单会显示在这里。', '第一次周六归档后，历史名单会显示在这里。', 'Weekly history will appear after the first Saturday archive.');
  add('只有管理员可以操作', '只有管理员可以操作', 'Only an admin can perform this action');
  add('你只能修改自己的状态', '你只能修改自己的状态', 'You can only edit your own status');
  add('管理员密码错误', '管理员密码错误', 'Incorrect admin password');
  add('管理员已登录', '管理员已登录', 'Admin signed in');
  add('管理员已退出', '管理员已退出', 'Admin signed out');
  add('已复制到剪贴板！', '已复制到剪贴板！', 'Copied to clipboard!');
  add('加载失败，请刷新页面', '加载失败，请刷新页面', 'Loading failed. Refresh the page.');
  add('需要配置 Firebase 才能多人实时共享', '需要配置 Firebase 才能多人实时共享', 'Firebase must be configured for live multi-user sharing');
  add('无法连接实时数据库', '无法连接实时数据库', 'Unable to connect to the live database');
  add('正在连接实时数据', '正在连接实时数据', 'Connecting to live data');
  add('直接生成赛程。', '直接生成赛程。', 'Generate the schedule directly.');

  // Courts page.
  add('Dove Cup 三轮升降级赛程', '金鸽杯三轮升降级赛程', 'Dove Cup Three-Round Court Schedule');
  add('三轮升降级赛程', '三轮升降级赛程', 'Three-Round Court Schedule');
  add('正在读取接龙报名名单...', '正在读取接龙报名名单...', 'Loading the registration list...');
  add('🎲 重新生成首轮', '🎲 重新生成首轮', '🎲 Regenerate Round 1');
  add('重新生成首轮', '重新生成首轮', 'Regenerate Round 1');
  add('💾 保存赛程和比分', '💾 保存赛程和比分', '💾 Save Schedule and Scores');
  add('保存赛程和比分', '保存赛程和比分', 'Save Schedule and Scores');
  add('📋 复制三轮表格', '📋 复制三轮表格', '📋 Copy Three-Round Table');
  add('复制三轮表格', '复制三轮表格', 'Copy Three-Round Table');
  add('报名页', '报名页', 'Registration');
  add('场地分组', '场地分组', 'Court Assignments');
  add('特别活动', '特别活动', 'Special Events');
  add('✍️ 手动输入名单', '✍️ 手动输入名单', '✍️ Enter Roster Manually');
  add('手动输入名单', '手动输入名单', 'Enter Roster Manually');
  add('报名人数', '报名人数', 'Registered Players');
  add('场地数', '场地数', 'Courts');
  add('轮数', '轮数', 'Rounds');
  add('已录比分', '已录比分', 'Scores Entered');
  add('第 1 轮就是首轮位置，直接看自己在哪个 Court。每轮打完录入比分后，系统会自动生成下一轮；详细升降级去向在底部总表里。', '第 1 轮就是首轮位置，直接看自己在哪个场地。每轮打完录入比分后，系统会自动生成下一轮；详细升降级去向在底部总表里。', 'Round 1 shows the starting positions. After each round, enter scores and the system will generate the next round. Detailed movements appear in the summary table below.');
  add('场地数量', '场地数量', 'Number of Courts');
  add('保存场地数', '保存场地数', 'Save Court Count');
  add('清空三轮比分', '清空三轮比分', 'Clear Three-Round Scores');
  add('使用这份名单生成赛程', '使用这份名单生成赛程', 'Generate Schedule from This Roster');
  add('清空', '清空', 'Clear');
  add('正在快速读取接龙名单...', '正在快速读取接龙名单...', 'Quickly loading the registration list...');
  add('三轮总表', '三轮总表', 'Three-Round Summary');
  add('方便截图/打印', '方便截图/打印', 'Ready for screenshots or printing');
  add('轮次', '轮次', 'Round');
  add('分级', '分级', 'Division');
  add('场地', '场地', 'Court');
  add('A 队', 'A 队', 'Team A');
  add('B 队', 'B 队', 'Team B');
  add('比分', '比分', 'Score');
  add('胜方去向', '胜方去向', 'Winner Moves To');
  add('负方去向', '负方去向', 'Loser Moves To');
  add('首轮按当前报名名单分组', '首轮按当前报名名单分组', 'Round 1 uses the current registration list');
  add('胜方', '胜方', 'Winner');
  add('负方', '负方', 'Loser');
  add('可拖拽调整', '可拖拽调整', 'Drag to Adjust');
  add('Admin 可拖拽调整', '管理员可拖拽调整', 'Admin Can Drag to Adjust');
  add('空位', '空位', 'Open Spot');
  add('手动名单 · 三轮升降级赛程', '手动名单 · 三轮升降级赛程', 'Manual Roster · Three-Round Schedule');
  add('手动模式', '手动模式', 'Manual Mode');
  add('自动读取报名名单', '自动读取报名名单', 'Automatically Loading Registration List');
  add('读取失败', '读取失败', 'Loading Failed');
  add('读取接龙数据失败。管理员可以点“手动输入名单”直接生成赛程。', '读取接龙数据失败。管理员可以点“手动输入名单”直接生成赛程。', 'Unable to load registration data. An admin can use “Enter Roster Manually” to generate the schedule.');
  add('只有管理员可以修改赛程', '只有管理员可以修改赛程', 'Only an admin can edit the schedule');
  add('请输入 1-20 的场地数量', '请输入 1-20 的场地数量', 'Enter a court count from 1 to 20');
  add('只能在同一个分级里调整场地', '只能在同一个分级里调整场地', 'Players can only move within the same division');
  add('赛程和比分已保存', '赛程和比分已保存', 'Schedule and scores saved');
  add('赛程保存失败，请检查网络', '赛程保存失败，请检查网络', 'Schedule save failed. Check your connection.');
  add('确定清空三轮比分吗？', '确定清空三轮比分吗？', 'Clear all three rounds of scores?');

  // Attendance page.
  add('Dove Cup 到场记录', '金鸽杯到场记录', 'Dove Cup Attendance');
  add('到场记录', '到场记录', 'Attendance');
  add('这里只记录每个人实际到场的次数。每周六晚 7 点归档后自动更新，不再记录胜局和积分。', '这里只记录每个人实际到场的次数。每周六晚 7 点归档后自动更新，不再记录胜局和积分。', 'This page records actual attendance only. It updates after the Saturday 7:00 PM archive and does not track wins or points.');
  add('到场人员', '到场人员', 'Players Attended');
  add('累计到场', '累计到场', 'Total Attendances');
  add('最多到场', '最多到场', 'Most Attendances');
  add('已记录周数', '已记录周数', 'Weeks Recorded');
  add('管理员补录到场', '管理员补录到场', 'Admin Attendance Adjustment');
  add('记录当前名单到场一次', '记录当前名单到场一次', 'Record Current Roster Once');
  add('人员姓名', '人员姓名', 'Player Name');
  add('单独记录此人到场一次', '单独记录此人到场一次', 'Record This Player Once');
  add('删除此人到场记录', '删除此人到场记录', 'Delete This Player\'s Attendance');
  add('清空全部到场记录', '清空全部到场记录', 'Clear All Attendance');
  add('周六归档会自动记录正式名单；这里仅用于管理员修正到场次数。', '周六归档会自动记录正式名单；这里仅用于管理员修正到场次数。', 'The Saturday archive records the official roster automatically. Use this area only for admin corrections.');
  add('到场次数', '到场次数', 'Attendances');
  add('本周报名名单', '本周报名名单', 'This Week\'s Registration');
  add('报名后会实时显示在这里；每周六晚 7 点归档后，才会增加本周到场次数。', '报名后会实时显示在这里；每周六晚 7 点归档后，才会增加本周到场次数。', 'Registrations appear here live. This week\'s attendance is added only after the Saturday 7:00 PM archive.');
  add('有历史到场记录', '有历史到场记录', 'Previous Attendance');
  add('首次报名，待到场', '首次报名，待到场', 'First Registration · Pending');
  add('本周还没有人报名。', '本周还没有人报名。', 'No one has registered this week yet.');
  add('未分级', '未分级', 'Unassigned');
  add('排名', '排名', 'Rank');
  add('最近到场', '最近到场', 'Last Attendance');
  add('状态', '状态', 'Status');
  add('操作', '操作', 'Actions');
  add('还没有到场记录。首次周六归档后，这里会自动显示。', '还没有到场记录。首次周六归档后，这里会自动显示。', 'No attendance has been recorded yet. It will appear after the first Saturday archive.');
  add('最近更新', '最近更新', 'Recent Updates');
  add('到场记录实时同步中', '到场记录实时同步中', 'Attendance Syncing Live');
  add('已报名，暂未到场', '已报名，暂未到场', 'Registered, Not Yet Attended');
  add('已记录', '已记录', 'Recorded');
  add('报名名单', '报名名单', 'Registration List');
  add('暂无更新记录', '暂无更新记录', 'No Recent Updates');
  add('记录到场：', '记录到场：', 'Attendance recorded:');
  add('记录到场一次', '记录到场一次', 'attendance recorded once');
  add('到场记录已删除', '到场记录已删除', 'attendance record deleted');
  add('全部到场记录已清空', '全部到场记录已清空', 'All attendance records cleared');
  add('到场记录已更新', '到场记录已更新', 'Attendance updated');
  add('特别活动到场', '特别活动到场', 'Special Event Attendance');
  add('活动归档后，参赛名单会保留在这里。', '活动归档后，参赛名单会保留在这里。', 'Archived special-event rosters will appear here.');
  add('已切换为只记录到场次数', '已切换为只记录到场次数', 'Switched to attendance-only tracking');
  add('自动记录到场：', '自动记录到场：', 'Attendance recorded automatically:');
  add('只有管理员可以更新到场记录', '只有管理员可以更新到场记录', 'Only an admin can update attendance');
  add('当前报名名单为空', '当前报名名单为空', 'The current registration list is empty');
  add('请输入姓名', '请输入姓名', 'Enter a name');
  add('请输入要删除的姓名', '请输入要删除的姓名', 'Enter the name to delete');
  add('到场记录里找不到这个人', '到场记录里找不到这个人', 'This player was not found in attendance records');
  add('确定清空全部到场记录吗？', '确定清空全部到场记录吗？', 'Clear all attendance records?');
  add('云端保存失败，请检查网络', '云端保存失败，请检查网络', 'Cloud save failed. Check your connection.');
  add('删除', '删除', 'Delete');

  const exact = { zh: new Map(), en: new Map() };
  entries.forEach((entry) => {
    exact.zh.set(entry.source, entry.zh);
    exact.en.set(entry.source, entry.en);
  });
  const fragments = entries.filter(entry => entry.source.length > 1)
    .sort((a, b) => b.source.length - a.source.length);
  const textSources = new WeakMap();
  const attrSources = new WeakMap();
  let currentLanguage = 'zh';
  let observer = null;
  let initialized = false;

  function normalizeLanguage(value) {
    return value === 'en' ? 'en' : 'zh';
  }

  function translatePatterns(text, language) {
    let next = text;
    if (language === 'en') {
      next = next
        .replace(/^本活动已于\s*(.+)\s*归档，(\d+)\s*位参赛选手已记录到场。$/, 'Archived on $1. Attendance was recorded for $2 players.')
        .replace(/^活动归档完成，(\d+)\s*位参赛选手已记录到场$/, 'Event archived. Attendance was recorded for $1 players.')
        .replace(/^特别活动\s*·\s*(.+)：(\d+)\s*人到场$/, 'Special Event · $1: $2 attendees')
        .replace(/^归档后名单、组合和比分将锁定，并把当前\s*(\d+)\s*位参赛选手各记录到场一次。当前还有\s*(\d+)\s*场没有录入比分，也会按现状保存。确定继续吗？$/, 'Archive and lock the roster, pairs, and scores, then record one attendance for each of the $1 players? $2 matches are still missing scores and will be preserved as-is.')
        .replace(/^归档后名单、组合和比分将锁定，并把当前\s*(\d+)\s*位参赛选手各记录到场一次。确定继续吗？$/, 'Archive and lock the roster, pairs, and scores, then record one attendance for each of the $1 players?')
        .replace(/^男\s*(\d+\s*\/\s*\d+)$/, 'Men $1')
        .replace(/^女\s*(\d+\s*\/\s*\d+)$/, 'Women $1')
        .replace(/^确定移除固定搭档\s+(.+)\s+吗？两个人会一起退出。$/, 'Remove fixed partners $1? Both players will leave.')
        .replace(/^确定移除\s+(.+)\s+的团体赛报名吗？$/, 'Remove $1 from the team event?')
        .replace(/^确定删除第\s*(\d+)\s*轮吗？该轮比分会一起删除，且无法恢复。$/, 'Delete Round $1? Its scores will also be deleted and cannot be restored.')
        .replace(/第\s*(\d+)\s*轮结果决定本轮场地/g, 'Round $1 results determine this round\'s courts')
        .replace(/第\s*(\d+)\s*轮/g, 'Round $1')
        .replace(/(\d+)\s*\/\s*(\d+)\s*场已完成/g, '$1 / $2 matches completed')
        .replace(/(\d+)\s*\/\s*(\d+)\s*完成/g, '$1 / $2 completed')
        .replace(/已同步\s*(\d+)\s*人\s*·\s*(\d+)\s*个分级/g, '$1 players synced · $2 divisions')
        .replace(/凤凰组合\s*(\d+)/g, 'Phoenix Pair $1')
        .replace(/狮鹫组合\s*(\d+)/g, 'Griffin Pair $1')
        .replace(/凤凰\s*(\d+)\s*分/g, 'Phoenix $1 pts')
        .replace(/狮鹫\s*(\d+)\s*分/g, 'Griffin $1 pts')
        .replace(/(\d+)\s*个分级/g, '$1 divisions')
        .replace(/(\d+)\s*个空位/g, '$1 spots left')
        .replace(/(\d+)\s*张活动照片/g, (_, count) => `${count} event photo${Number(count) === 1 ? '' : 's'}`)
        .replace(/(\d+)\s*人/g, '$1 players')
        .replace(/(\d+)\s*次/g, '$1 times')
        .replace(/(\d+)\s*周/g, '$1 weeks')
        .replace(/(\d+)\s*分(?!钟)/g, '$1 pts');
    } else {
      next = next
        .replace(/^Men QF(\d+)$/i, '男单四分之一决赛 $1')
        .replace(/^Women QF(\d+)$/i, '女单四分之一决赛 $1')
        .replace(/^Men SF(\d+)$/i, '男单半决赛 $1')
        .replace(/^Women SF(\d+)$/i, '女单半决赛 $1')
        .replace(/^Men Final$/i, '男单决赛')
        .replace(/^Women Final$/i, '女单决赛')
        .replace(/^Men (\d+) vs Men (\d+)$/i, '男选手 $1 对阵 男选手 $2')
        .replace(/^Women (\d+) vs Women (\d+)$/i, '女选手 $1 对阵 女选手 $2')
        .replace(/^Men (\d+)$/i, '男选手 $1')
        .replace(/^Women (\d+)$/i, '女选手 $1')
        .replace(/^Start on Court (\d+)$/i, '在场地 $1 开始')
        .replace(/Round\s*(\d+)/gi, '第 $1 轮')
        .replace(/Court\s*(\d+)/gi, '场地 $1')
        .replace(/(\d+)\s*COURTS?/gi, '$1 片场地')
        .replace(/(\d+)\s*ROUNDS?/gi, '$1 轮')
        .replace(/(\d+)\s*MIN\s*\/\s*MATCH/gi, '每场 $1 分钟')
        .replace(/(\d+)\s*EVENTS?/gi, '$1 场活动');
    }
    return next;
  }

  function localizeCore(text, language) {
    const lang = normalizeLanguage(language);
    if (exact[lang].has(text)) return exact[lang].get(text);
    let next = translatePatterns(text, lang);
    fragments.forEach((entry) => {
      if (next.includes(entry.source)) next = next.split(entry.source).join(entry[lang]);
    });
    return next;
  }

  function localizeText(value, language) {
    const text = String(value == null ? '' : value);
    const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match || !match[2]) return text;
    return match[1] + localizeCore(match[2], language) + match[3];
  }

  function isSkipped(node) {
    const parent = node.nodeType === 1 ? node : node.parentElement;
    return !parent || SKIP_TAGS.has(parent.tagName) || Boolean(parent.closest('[data-dove-no-translate]'));
  }

  function translateTextNode(node, refreshSource) {
    if (isSkipped(node) || !node.nodeValue || !node.nodeValue.trim()) return;
    const stored = textSources.get(node);
    if (refreshSource || stored == null) textSources.set(node, node.nodeValue);
    const source = textSources.get(node);
    const translated = localizeText(source, currentLanguage);
    if (node.nodeValue !== translated) node.nodeValue = translated;
  }

  function translateAttributes(element, refreshSource) {
    if (isSkipped(element)) return;
    const names = ['placeholder', 'title', 'aria-label'];
    const saved = attrSources.get(element) || {};
    names.forEach((name) => {
      if (!element.hasAttribute(name)) return;
      const current = element.getAttribute(name);
      if (refreshSource || saved[name] == null) saved[name] = current;
      const translated = localizeText(saved[name], currentLanguage);
      if (current !== translated) element.setAttribute(name, translated);
    });
    attrSources.set(element, saved);
  }

  function translateTree(rootNode, refreshSource) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) {
      translateTextNode(rootNode, refreshSource);
      return;
    }
    if (rootNode.nodeType !== 1 && rootNode.nodeType !== 9) return;
    if (rootNode.nodeType === 1) translateAttributes(rootNode, refreshSource);
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === 3) translateTextNode(node, refreshSource);
      else translateAttributes(node, refreshSource);
      node = walker.nextNode();
    }
  }

  function translateDocument() {
    document.documentElement.lang = currentLanguage === 'en' ? 'en' : 'zh-CN';
    if (document.title) {
      const titleElement = document.querySelector('title');
      if (titleElement) translateTextNode(titleElement.firstChild, false);
    }
    document.querySelectorAll('meta[name="description"]').forEach((meta) => {
      const saved = attrSources.get(meta) || {};
      if (saved.content == null) saved.content = meta.getAttribute('content') || '';
      meta.setAttribute('content', localizeText(saved.content, currentLanguage));
      attrSources.set(meta, saved);
    });
    translateTree(document.body, false);
    updateToggle();
  }

  function updateToggle() {
    const toggle = document.querySelector('.dove-language-toggle');
    if (!toggle) return;
    toggle.dataset.language = currentLanguage;
    toggle.setAttribute('aria-checked', String(currentLanguage === 'en'));
    toggle.setAttribute('aria-label', currentLanguage === 'en' ? 'Switch to Chinese' : '切换为英文');
  }

  function createToggle() {
    if (!document.body || document.querySelector('.dove-language-switch')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'dove-language-switch';
    wrapper.setAttribute('data-dove-no-translate', '');
    wrapper.innerHTML = '<button class="dove-language-toggle" type="button" role="switch"><span class="dove-language-thumb" aria-hidden="true"></span><span class="dove-language-label dove-language-label-zh">中</span><span class="dove-language-label dove-language-label-en">EN</span></button>';
    wrapper.querySelector('button').addEventListener('click', () => {
      setLanguage(currentLanguage === 'zh' ? 'en' : 'zh');
    });
    document.body.appendChild(wrapper);
    updateToggle();
  }

  function setLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    try { localStorage.setItem(STORAGE_KEY, currentLanguage); } catch (error) {}
    if (typeof document !== 'undefined' && document.body) translateDocument();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dove:languagechange', { detail: { language: currentLanguage } }));
    }
    return currentLanguage;
  }

  function installDialogTranslation() {
    if (typeof window === 'undefined' || window.__doveDialogsLocalized) return;
    window.__doveDialogsLocalized = true;
    const originalAlert = window.alert.bind(window);
    const originalConfirm = window.confirm.bind(window);
    const originalPrompt = window.prompt.bind(window);
    window.alert = (message) => originalAlert(localizeText(message, currentLanguage));
    window.confirm = (message) => originalConfirm(localizeText(message, currentLanguage));
    window.prompt = (message, value) => originalPrompt(localizeText(message, currentLanguage), value);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          const source = textSources.get(mutation.target);
          const expected = source == null ? null : localizeText(source, currentLanguage);
          translateTextNode(mutation.target, source == null || mutation.target.nodeValue !== expected);
          return;
        }
        mutation.addedNodes.forEach((node) => translateTree(node, true));
      });
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  function ready() {
    createToggle();
    translateDocument();
    startObserver();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    try { currentLanguage = normalizeLanguage(localStorage.getItem(STORAGE_KEY)); } catch (error) {}
    installDialogTranslation();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
    else ready();
  }

  return {
    init,
    getLanguage: () => currentLanguage,
    setLanguage,
    localizeText
  };
}));
