window.DOVE_RECURRING_EVENTS = [
  {
    id: 'golden-dove-tour',
    status: '常驻活动',
    eyebrow: 'Resident Event · Weekly Tour',
    title: '金鸽巡回赛',
    summary: '每周开放的分级升降场巡回赛。四个分级各自进行三轮对局，报名、场地安排和长期到场记录都集中在这里。',
    schedule: '每周六 · 长期开放',
    venue: 'Toronto',
    format: '4 个分级 · 三轮升降级',
    tools: [
      { label: '报名接龙', hint: '加入本周名单和候补名单', href: 'signup.html' },
      { label: '场地分组', hint: '查看三轮场地与比分', href: 'courts.html' },
      { label: '到场记录', hint: '查看累计到场次数', href: 'scores.html' }
    ]
  }
];

window.DOVE_EVENTS = [
  {
    id: '2026-08-08-mixed-team',
    eventNumber: 12,
    featured: true,
    eyebrow: 'Team Special · Mixed Doubles',
    date: '2026-08-08',
    dateLabel: 'AUG 08 · SATURDAY',
    title: '凤凰 vs 狮鹫',
    summary: '两支队伍、四片室内场地、固定混双搭档。每一场胜利都为团队带回 1 分。',
    venue: 'MRTC · Toronto',
    format: '4 Courts · Mixed Doubles · Team Score',
    attendeeCount: 16,
    result: {
      winner: '狮鹫',
      winnerPoints: 8,
      loserPoints: 4,
      winnerGames: 54,
      loserGames: 37
    },
    gallery: {
      title: '凤凰 vs 狮鹫',
      titleEn: 'Phoenix vs Griffin',
      cover: 'assets/events/2026-08-08/team-group-photo-01.webp',
      coverAlt: '凤凰与狮鹫团体赛选手在 MRTC 室内网球场合影',
      coverAltEn: 'Phoenix and Griffin team-event players posing on an indoor court at MRTC',
      summary: '第 12 次活动的现场合影已经收录，名单、固定搭档、赛果和活动瞬间都保留在同一份档案里。',
      summaryEn: 'The Event 12 group photo is now archived with its roster, fixed partnerships, and full results.',
      pending: '第 12 次活动的现场照片正在整理中。照片上传后会与参赛名单、固定搭档和完整赛果一起永久保留在这里。',
      pendingEn: 'Photos from Event 12 are being prepared. Once uploaded, they will remain here with the roster, fixed partnerships, and full results.',
      photos: [
        {
          src: 'assets/events/2026-08-08/team-group-photo-01.webp',
          alt: '凤凰与狮鹫团体赛选手在 MRTC 室内网球场合影',
          altEn: 'Phoenix and Griffin team-event players posing on an indoor court at MRTC',
          caption: 'EVENT 12 · 8 月 8 日凤凰 vs 狮鹫团体赛 · MRTC 赛后合影',
          captionEn: 'EVENT 12 · Aug 8 Phoenix vs Griffin team event · Post-match photo at MRTC'
        }
      ]
    },
    href: 'team-event.html'
  },
  {
    id: '2026-singles-championship',
    eventNumber: 14,
    featured: true,
    eyebrow: 'Dove King Championship',
    date: '2026-08-29',
    dateLabel: 'AUG 29 · SATURDAY · 5–7 PM',
    title: 'Dove King Championship',
    summary: '男单、女单各 8 人独立报名，姓名实时同步到单淘汰签表；现场选择场地、录入比分后自动推进胜者。',
    venue: 'Toronto',
    format: '6 Courts · Men + Women Singles · 5–7 PM',
    attendeeCount: 16,
    archiveStats: [
      { label: '参赛人数', value: '16 人参赛' },
      { label: '签表', value: '男单 + 女单' },
      { label: '赛制', value: '单淘汰' }
    ],
    archiveAction: '查看赛事桌',
    href: 'singles-championship.html?v=2'
  }
];

window.DoveEventStatus = {
  torontoDateId(timestamp = Date.now()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  },
  forEvent(event, timestamp = Date.now()) {
    const eventDate = String(event && event.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return event && event.status || '即将开始';
    const today = this.torontoDateId(timestamp);
    if (today > eventDate) return '已结束';
    if (today === eventDate) return '进行中';
    return '即将开始';
  },
  classFor(status) {
    if (status === '进行中') return 'status-live';
    if (status === '已结束') return 'status-ended';
    return 'status-upcoming';
  }
};
