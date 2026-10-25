(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const ledger = window.DoveFinance;
  const store = window.DoveFinanceStore;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const language = () => window.DoveLanguage?.getLanguage() || 'zh';
  const text = (zh, en) => language() === 'en' ? en : zh;
  const money = value => new Intl.NumberFormat(language() === 'en' ? 'en-CA' : 'zh-CN', { style: 'currency', currency: 'CAD' }).format(value);
  const venue = key => key === 'nyta-east' ? 'NYTA East Bubble' : 'MRTC';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const admin = () => sessionStorage.getItem('signup_is_admin') === '1';
  let demo = false, demoRows = [], selected = '', view = 'members', currentRows = [], syncing = false;

  function makeDemo() {
    let rows = [];
    const add = input => {
      const date = input.date || '2026-10-17';
      rows = ledger.append(rows, { id: `demo-${rows.length}`, date, venueKey: 'mrtc', ts: Date.parse(`${date}T21:00:00Z`) + rows.length, ...input });
    };
    add({ name: 'Demo Player A', type: 'payment', plan: 'package10', amount: 350 });
    for (const date of ['2026-10-17', '2026-10-24', '2026-10-31']) add({ name: 'Demo Player A', type: 'usage', date });
    add({ name: 'Demo Player A', type: 'payment', plan: 'single', amount: 40, date: '2026-11-07' });
    add({ name: 'Demo Player A', type: 'attendance', date: '2026-11-07' });
    add({ name: 'Demo Player B', type: 'payment', plan: 'single', amount: 40 });
    add({ name: 'Demo Player B', type: 'attendance' });
    return rows;
  }
  function message(value) {
    $('message').textContent = window.DoveLanguage?.localizeText(value, language()) || value;
  }
  function title(row) {
    if (row.type === 'payment') return row.plan === 'package10' ? text('购买10次套餐', '10-Visit Package Purchase') : text('单次收款', 'Single-Visit Payment');
    return { usage: text('套餐到场', 'Package Attendance'), attendance: text('单次到场', 'Single-Visit Attendance'), reversal: text('撤销到场', 'Attendance Reversed'), refund: text('整笔退款', 'Full Refund') }[row.type] || row.type;
  }
  function action(row) {
    if (!ledger.active(currentRows, row)) return text('已撤销或退款', 'Reversed / Refunded');
    if (['usage', 'attendance'].includes(row.type)) return `<button type="button" data-reverse="${escape(row.id)}">${text('撤销到场', 'Reverse Attendance')}</button>`;
    if (row.type === 'payment') return `<button type="button" data-refund="${escape(row.id)}">${text('记录整笔退款', 'Record Full Refund')}</button>`;
    return '';
  }
  function detailRows(rows, full) {
    return rows.slice().reverse().map(row => `<tr>${full ? `<td>${escape(row.date)}</td><td>${escape(venue(row.venueKey))}</td>` : `<td>${escape(row.name)}</td>`}<td>${escape(title(row))}${row.note ? `<div style="font-size:11px;color:#637368;white-space:normal">${escape(row.note)}</div>` : ''}</td><td>${escape(money(row.amountCents / 100))}</td><td class="${row.visits < 0 ? 'negative' : 'positive'}">${row.visits > 0 ? '+' : ''}${row.visits || '—'}</td><td>${action(row)}</td></tr>`).join('');
  }
  function render() {
    const allowed = admin() || demo;
    $('gate').hidden = allowed;
    $('workspace').hidden = !allowed;
    $('exportButton').disabled = !admin() || demo;
    $('importPayments').disabled = !admin() || demo || syncing;
    $('restoreButton').disabled = !admin() || demo;
    $('resetFinanceButton').disabled = !admin() || demo;
    $('resetBackupButton').disabled = !admin() || demo || !store.resetBackup();
    $('demoButton').textContent = demo ? text('返回本机账本', 'Back to Local Ledger') : text('查看示例', 'View Demo');
    $('demoNotice').hidden = !demo;
    if (!allowed) return;
    try { currentRows = demo ? demoRows : store.read(); } catch (error) { message(error.message); return; }
    if (!selected) selected = currentRows.filter(row => row.type === 'payment').sort((a, b) => b.ts - a.ts)[0]?.name || '';
    const members = ledger.members(currentRows);
    $('totalMoney').textContent = money(members.reduce((sum, member) => sum + member.received, 0));
    $('totalVisits').textContent = members.reduce((sum, member) => sum + member.remaining, 0);
    $('totalMembers').textContent = members.length;
    const search = window.DovePlayerIdentity.key($('search').value);
    const filtered = members.filter(member => !search || window.DovePlayerIdentity.key(member.name).includes(search));
    $('memberRows').setAttribute('data-dove-no-translate', '');
    $('memberRows').innerHTML = filtered.map(member => `<tr><td><button class="member-button" type="button" data-member="${escape(member.name)}">${escape(member.name)}</button></td><td data-label="${text('累计实收', 'Net Receipts')}">${escape(money(member.received))}</td><td data-label="${text('套餐已购', 'Purchased')}">${member.purchased}</td><td data-label="${text('套餐已用', 'Used')}">${member.used}</td><td data-label="${text('剩余', 'Remaining')}"><strong>${member.remaining}</strong></td><td data-label="${text('确认到场', 'Attendance')}">${member.attended}</td></tr>`).join('');
    $('memberEmpty').hidden = filtered.length > 0;
    $('memberNames').innerHTML = members.map(member => `<option value="${escape(member.name)}"></option>`).join('');
    $('memberDetail').hidden = !selected;
    if (selected) {
      const member = ledger.summary(currentRows, selected);
      const receipt = member.rows.filter(row => row.type === 'payment').sort((a, b) => b.ts - a.ts)[0];
      const receiptTime = receipt ? new Intl.DateTimeFormat(language() === 'en' ? 'en-CA' : 'zh-CN', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' }).format(receipt.ts) : '';
      const receiptSummary = receipt ? `<div class="receipt-summary"><div><span>${text('最近一笔收款', 'Latest Receipt')}</span><strong>${escape(money(receipt.amountCents / 100))} · ${ledger.active(currentRows, receipt) ? text('已收款', 'Received') : text('已退款', 'Refunded')}</strong></div><div><span>${text('活动日期与场地', 'Event Date & Venue')}</span><strong>${escape(receipt.date)} · ${escape(venue(receipt.venueKey))}</strong></div><div><span>${text('核实时间 · 多伦多', 'Recorded At · Toronto')}</span><strong>${escape(receiptTime)}</strong></div></div>` : '';
      $('memberDetail').setAttribute('data-dove-no-translate', '');
      $('memberDetail').innerHTML = `<h2>${escape(member.name)} · ${text('逐笔明细', 'Transaction History')}</h2>${receiptSummary}<div class="table-wrap"><table><thead><tr><th>${text('活动日期', 'Event Date')}</th><th>${text('场地', 'Venue')}</th><th>${text('项目', 'Item')}</th><th>${text('实收金额', 'Amount Received')}</th><th>${text('套餐变动', 'Visit Change')}</th><th>${text('操作', 'Action')}</th></tr></thead><tbody>${detailRows(member.rows, true)}</tbody></table></div>`;
    }
    const sessionRows = currentRows.filter(row => row.date === $('filterDate').value && ($('filterVenue').value === 'all' || row.venueKey === $('filterVenue').value));
    $('sessionRows').setAttribute('data-dove-no-translate', '');
    $('sessionRows').innerHTML = detailRows(sessionRows, false);
    $('sessionEmpty').hidden = sessionRows.length > 0;
    const count = sessionRows.filter(row => ['usage', 'attendance'].includes(row.type) && ledger.active(currentRows, row)).length;
    $('sessionTotal').setAttribute('data-dove-no-translate', '');
    $('sessionTotal').textContent = `${text('实收', 'Received')} ${money(sessionRows.reduce((sum, row) => sum + row.amountCents, 0) / 100)} · ${text('确认到场', 'Confirmed Attendance')} ${count}`;
    $('membersView').hidden = view !== 'members'; $('sessionView').hidden = view !== 'session';
    $('membersTab').setAttribute('aria-selected', String(view === 'members'));
    $('sessionTab').setAttribute('aria-selected', String(view === 'session'));
  }
  async function add(input) {
    if (demo) demoRows = ledger.append(demoRows, input);
    else {
      if (!admin()) throw new Error('请先登录管理员');
      await store.add(input);
    }
    render();
  }
  let saving = false;
  $('entryForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    saving = true;
    const submit = $('entryForm').querySelector('[type=submit]');
    submit.disabled = true;
    const type = $('entryType').value;
    const input = { id: crypto.randomUUID(), name: $('entryName').value.trim(), date: $('entryDate').value,
      venueKey: $('entryVenue').value, type: ['usage', 'attendance'].includes(type) ? type : 'payment',
      plan: type, amount: Number($('entryAmount').value), note: $('entryNote').value.trim() };
    try {
      await add(input);
      selected = window.DovePlayerIdentity.canonicalName(input.name);
      $('entryNote').value = '';
      if (input.type === 'payment') $('entryAmount').value = '';
      message(text('记录已保存', 'Record saved'));
      render();
    } catch (error) { message(error.message); }
    finally { saving = false; submit.disabled = false; }
  });
  $('entryType').addEventListener('change', () => {
    const payment = ['single', 'package10'].includes($('entryType').value);
    $('amountField').hidden = !payment;
    $('entryAmount').required = payment;
    $('entryAmount').value = $('entryType').value === 'package10' ? '350' : '40';
  });
  document.addEventListener('click', async event => {
    const memberButton = event.target.closest('[data-member]');
    if (memberButton) { selected = memberButton.dataset.member; $('entryName').value = selected; render(); return; }
    const button = event.target.closest('[data-reverse],[data-refund]');
    if (!button) return;
    const refund = Boolean(button.dataset.refund);
    const original = currentRows.find(row => row.id === (button.dataset.refund || button.dataset.reverse));
    if (!original || !confirm(refund ? text('确认已实际退还这笔款项？', 'Confirm that this payment has actually been refunded?') : text('撤销本次到场记录并恢复扣次？', 'Reverse this attendance record and restore any visit used?'))) return;
    try { await add({ id: crypto.randomUUID(), name: original.name, date: today(), venueKey: original.venueKey, type: refund ? 'refund' : 'reversal', reverses: original.id }); message(text('记录已保存', 'Record saved')); }
    catch (error) { message(error.message); }
  });
  $('membersTab').onclick = () => { view = 'members'; render(); };
  $('sessionTab').onclick = () => { view = 'session'; render(); };
  for (const id of ['search', 'filterDate', 'filterVenue']) $(id).addEventListener('input', render);
  $('demoButton').onclick = () => { demo = !demo; if (demo) demoRows = makeDemo(); selected = ''; render(); };
  function download(backup = null, filename = `dove-finance-${today()}.json`) {
    if (!admin() || demo) return;
    const blob = new Blob([JSON.stringify(backup || { format: 'dove-finance-v1', exportedAt: new Date().toISOString(), entries: store.read() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('exportButton').onclick = () => download();
  $('resetFinanceButton').onclick = () => { if (admin() && !demo) $('resetFinanceDialog').showModal(); };
  $('cancelFinanceReset').onclick = () => $('resetFinanceDialog').close();
  $('confirmFinanceReset').onclick = async () => {
    if (!admin() || demo) return;
    $('confirmFinanceReset').disabled = true;
    try { await store.resetFinance(); selected = ''; $('resetFinanceDialog').close(); render(); message(text('收款与套餐已归零，到场记录保留。', 'Payments and packages reset. Attendance records preserved.')); }
    catch (error) { $('resetFinanceError').textContent = error.message; }
    finally { $('confirmFinanceReset').disabled = false; }
  };
  $('resetBackupButton').onclick = () => { const backup = store.resetBackup(); if (backup) download(backup, `dove-finance-before-reset-${today()}.json`); };
  $('restoreButton').onclick = () => $('restoreFile').click();
  async function syncVerifiedReceipts() {
    if (!admin() || demo || syncing) return;
    syncing = true;
    $('importPayments').disabled = true;
    try {
      const base = 'https://dovecupdatabase-default-rtdb.firebaseio.com/doveCupWaitlistSystem/';
      const read = async path => {
        const response = await fetch(`${base}${path}.json`);
        if (!response.ok) throw new Error('收款读取失败');
        return response.json();
      };
      const [mrtc, nyta, history] = await Promise.all([read('main'), read('venues/nyta-east/main'), read('signupHistory')]);
      const date = window.DoveVenues.nextSessionDate();
      const sources = [
        { venueKey: 'mrtc', date, people: mrtc?.state?.joined },
        { venueKey: 'nyta-east', date, people: nyta?.state?.joined },
        ...Object.values(history || {}).map(archive => ({ venueKey: archive.venueKey || 'mrtc', date: archive.resetId, people: archive.joined }))
      ];
      const before = store.read().length;
      let excludedByReset = 0, unknown = 0;
      const cutoff = Number(localStorage.getItem('dove_finance_start_at') || 0);
      for (const source of sources) for (const person of source.people || []) {
        if (['小王', 'test'].includes(String(person.name).trim().toLowerCase())) continue;
        if (person.paymentStatus !== 'received' && !person.paid) continue;
        if (!person.paymentVerifiedAt || !Number(person.paymentAmount)) { unknown++; continue; }
        if (Number(person.paymentVerifiedAt) <= cutoff) { excludedByReset++; continue; }
        await store.recordPayment(person, { date: person.paymentEventDate || source.date, venueKey: source.venueKey });
      }
      const added = store.read().length - before;
      message(text(`收款同步完成：新增${added}笔；清零前记录跳过${excludedByReset}笔；缺少金额或核实时间的旧记录${unknown}笔，不计入实收。`, `Receipts synced: ${added} added; ${excludedByReset} excluded by your reset; ${unknown} historical records lack an amount or verification time and are not counted.`));
      render();
    } catch (error) { message(error.message); }
    finally { syncing = false; render(); }
  }
  $('importPayments').onclick = syncVerifiedReceipts;
  $('restoreFile').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file || !admin() || demo) return;
    try {
      if (file.size > 12000000) throw new Error('备份文件过大');
      const backup = JSON.parse(await file.text());
      if (backup.format !== 'dove-finance-v1') throw new Error('账本格式无效');
      const entries = ledger.validate(backup.entries);
      if (!confirm(text('恢复将替换本机账本，当前账本会先自动导出。继续？', 'Restore replaces the local ledger. The current ledger will be exported first. Continue?'))) return;
      download(); await store.restore(entries); selected = ''; render(); message(text('备份已恢复', 'Backup restored'));
    } catch (error) { message(error.message); }
    finally { event.target.value = ''; }
  });
  for (const name of ['dove:languagechange', 'dove:financechange', 'storage']) window.addEventListener(name, render);
  $('entryDate').value = today(); $('filterDate').value = today();
  render();
  if (admin()) store.cleanupTestMembers().then(async count => {
    if (count) { selected = ''; render(); }
    await syncVerifiedReceipts();
  }).catch(error => message(error.message));
  if (location.hash === '#reset-finance' && admin()) $('resetFinanceDialog').showModal();
})();
