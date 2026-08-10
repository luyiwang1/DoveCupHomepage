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
    featured: true,
    eyebrow: 'Team Special · Mixed Doubles',
    date: '2026-08-08',
    dateLabel: 'AUG 08 · SATURDAY',
    title: '凤凰 vs 狮鹫',
    summary: '两支队伍、四片室内场地、固定混双搭档。每一场胜利都为团队带回 1 分。',
    venue: 'MRTC · Toronto',
    format: '4 Courts · Mixed Doubles · Team Score',
    href: 'team-event.html'
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
  }
};
