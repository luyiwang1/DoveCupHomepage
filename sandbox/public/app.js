const $=id=>document.getElementById(id);
let language=new URLSearchParams(location.search).get('lang')||localStorage.getItem('dove_sandbox_language')||'zh';
const t=(zh,en)=>language==='en'?en:zh;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=cents=>new Intl.NumberFormat(language==='en'?'en-CA':'zh-CN',{style:'currency',currency:'CAD'}).format(cents/100);
const levelName=level=>({u20:t('新手 · 2.5-','Beginner · Under 2.5'),'25_30':'2.5–3.0','30_plus':'3.0–3.5','35_plus':'3.5+'}[level]||level);
const venueName=id=>id==='nyta-east'?'NYTA East Bubble':'MRTC';
const state={user:null,csrf:'',events:[],profile:null,admin:null,legacy:[],roster:[],eventId:'',view:location.pathname==='/finance.html'?'admin':location.pathname==='/account.html'||location.pathname==='/scores.html'?'account':'sessions',tab:'bookings',adminTab:'payments',authMode:'login',busy:false};
const labels={pending:()=>t('待核实','Pending Verification'),received:()=>t('已收款','Received'),checked_in:()=>t('已到场','Checked In'),refunded:()=>t('已退款','Refunded'),joined:()=>t('正式报名','Registered'),waitlist:()=>t('候补','Waitlist'),cancelled:()=>t('已取消','Cancelled'),approved:()=>t('已关联','Linked'),rejected:()=>t('已拒绝','Rejected'),open:()=>t('报名中','Open'),archived:()=>t('已归档','Archived')};
const badge=value=>`<span class="status ${esc(value)}">${esc(labels[value]?.()||value)}</span>`;
const errors={login_required:['请先登录','Please sign in'],admin_required:['仅管理员可操作','Administrator access required'],not_owner:['不能修改他人的报名','You cannot change another member’s registration'],login_failed:['用户名或密码不正确','Incorrect username or password'],username_taken:['用户名已被使用','Username is already taken'],username_format:['用户名只能用小写字母、数字和下划线','Use lowercase letters, numbers and underscores'],password_length:['密码需10至64位，UTF-8长度不超过72字节','Password must have 10–64 characters and at most 72 UTF-8 bytes'],phone_tail:['只填写手机尾号4位数字','Enter exactly the last 4 phone digits'],already_booked:['本场已有报名，不用重复添加','You already have a registration for this session'],event_closed:['此场次已归档，不能再修改','This session is archived'],package_forbidden:['此会员未获授权使用该套餐','This member is not authorized to use this package'],no_visits:['套餐剩余次数不足','Insufficient package visits'],not_joined:['只有正式报名者可以登记到场','Only registered players can be checked in'],payment_not_verified:['请先核实付款，或选择可用套餐','Verify payment first, or select an available package'],already_attended:['已有到场记录，请先核对或撤销','An attendance record exists; review or reverse it first'],package_used:['套餐已有扣次，先核对并撤销相关到场才能整笔退款','Reverse package attendance before a full refund'],member_missing:['没有找到该会员用户名','Member username not found'],legacy_unavailable:['旧记录已被关联或不存在','Legacy record is unavailable'],recovery_failed:['用户名或恢复码不正确','Incorrect username or recovery code'],claim_not_pending:['申请已处理，请刷新','This claim has already been processed'],payment_not_pending:['该付款已处理，不能直接改金额','Payment was already processed and cannot be edited'],csrf_invalid:['页面凭证已更新，请刷新后重试','Session token changed. Refresh and retry'],too_many_attempts:['尝试次数过多，请稍后重试','Too many attempts. Try again later'],invalid_input:['请检查输入内容','Please check your input'],invalid_plan:['请选择付款项目','Select a payment plan'],invalid_level:['请选择等级','Select a division'],invalid_share:['不能将套餐重复共享给持有人','The owner already has access'],server_error:['服务暂时出错，请稍后重试','Server error. Try again shortly']};
function errorText(error){return errors[error.code]?.[language==='en'?1:0]||error.message||t('操作失败','Operation failed');}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5000);}
async function api(path,method='GET',body){const response=await fetch(`/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':state.csrf}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok){const e=new Error(data.error);e.code=data.error;e.status=response.status;throw e;}return data;}
async function refresh(){
  const boot=await api('/bootstrap');state.user=boot.user;state.csrf=boot.csrf;
  state.events=await api('/events');
  if(!state.eventId){const venue=new URLSearchParams(location.search).get('venue')||'mrtc';state.eventId=state.events.find(e=>e.venue_id===venue&&e.status==='open')?.id||state.events[0]?.id;}
  if(state.user){state.profile=await api('/me');state.legacy=await api('/legacy');state.admin=state.user.role==='admin'?await api('/admin'):null;}else{state.profile=null;state.admin=null;state.legacy=[];}
  if(state.eventId)state.roster=await api(`/events/${encodeURIComponent(state.eventId)}/roster`);
  render();
}
function table(headers,rows){if(!rows.length)return `<div class="empty">${t('暂无记录','No records yet')}</div>`;return `<div class="table-wrap mobile-list"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,index)=>`<td data-label="${esc(headers[index])}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
const action=(name,id,label,extra='',kind='small')=>`<button type="button" class="${kind}" data-action="${name}" data-id="${esc(id)}" ${extra}>${label}</button>`;
function currentEvent(){return state.events.find(e=>e.id===state.eventId);}
function eventOptions(){return state.events.map(e=>`<option value="${e.id}" ${e.id===state.eventId?'selected':''}>${e.date} · ${venueName(e.venue_id)}${e.status==='archived'?` · ${t('已归档','Archived')}`:''}</option>`).join('');}
function pageHead(title,subtitle=''){return `<div class="page-head"><div><h1>${title}</h1>${subtitle?`<p class="muted">${subtitle}</p>`:''}</div><div class="tools">${action('refresh','',t('刷新','Refresh'))}${state.user?action('logout','',t('退出登录','Sign Out')):''}</div></div>`;}
function render(){
  document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=t('金鸽杯 · 会员测试环境','Golden Dove Cup · Member Sandbox');
  $('environment').textContent=t('测试环境 · 独立数据库 · 不影响正式报名','TEST ENVIRONMENT · SEPARATE DATABASE · NO LIVE CHANGES');
  $('zhButton').classList.toggle('active',language!=='en');$('enButton').classList.toggle('active',language==='en');
  $('identityButton').textContent=state.user?state.user.displayName:t('登录 / 注册','Sign In / Register');$('identityButton').classList.toggle('account-name',!!state.user);
  $('navigation').innerHTML=`<a href="/signup.html" data-view="sessions" class="${state.view==='sessions'?'active':''}">${t('场次报名','Sessions')}</a><a href="/account.html" data-view="account" class="${state.view==='account'?'active':''}">${t('我的账户','My Account')}</a>${state.user?.role==='admin'?`<a href="/finance.html" data-view="admin" class="${state.view==='admin'?'active':''}">${t('管理中心','Admin')}</a>`:''}`;
  $('app').innerHTML=state.view==='sessions'?sessionsView():state.view==='admin'&&state.user?.role==='admin'?adminView():accountView();
}
function sessionsView(){
  const e=currentEvent(),date=e?.date||'',sameDay=state.events.filter(x=>x.date===date);
  const mine=state.profile?.bookings.find(b=>b.event_id===e?.id&&b.status!=='cancelled');
  const eligible=(state.profile?.packages||[]).filter(p=>p.remaining>0);
  const roster=state.roster.map(p=>[`${esc(p.display_name)}${p.mine?` <span class="member-tag">${t('这是你','You')}</span>`:''}`,esc(levelName(p.level)),badge(p.status)]);
  return `${pageHead(t('巡回赛报名','Tour Registration'),t('多伦多当地时间','Toronto local time'))}
  <div class="tools" style="margin-bottom:18px"><label for="eventDate">${t('活动日期','Session Date')}</label><select id="eventDate">${[...new Set(state.events.map(x=>x.date))].map(d=>`<option ${d===date?'selected':''}>${d}</option>`).join('')}</select></div>
  <div class="venue-grid">${sameDay.map(v=>`<article class="venue-card ${v.id===e.id?'selected':''}"><span class="venue-city">${v.venue.city}</span><h2>${v.venue.name}</h2><div class="time">${v.venue.time}</div><div class="subtle">${v.date} · ${badge(v.status)}</div><div class="venue-foot"><span>${v.joined} / ${v.venue.capacity} ${t('人','players')} · ${t('候补','Waitlist')} ${v.waiting}</span>${action('choose-event',v.id,t('选择场次','Select Session'))}</div></article>`).join('')}</div>
  ${e?`<div class="division-meter">${['u20','25_30','30_plus','35_plus'].map(level=>`<div><small>${levelName(level)}</small><strong>${e.counts.find(c=>c.level===level)?.count||0}${e.venue.levelCapacity?` / ${e.venue.levelCapacity}`:''}</strong></div>`).join('')}</div>`:''}
  <div class="split"><section class="band"><h2>${t('报名名单','Registration List')}</h2>${table([t('球友','Player'),t('等级','Division'),t('状态','Status')],roster)}</section><section class="band"><h2>${mine?t('我的报名','My Registration'):t('加入本场','Join This Session')}</h2>
  ${!state.user?`<div class="auth-empty"><p>${t('单次 $40 · 10次套餐 $350','Single visit $40 · 10-visit package $350')}</p>${action('auth','',t('登录后报名','Sign In to Register'),'','primary')}</div>`:mine?bookingCard(mine):`<form id="bookingForm" class="stack"><fieldset style="padding:0;border:0"><legend style="margin-bottom:8px">${t('等级','Division')}</legend><div class="level-options">${['u20','25_30','30_plus','35_plus'].map((l,i)=>`<label><input type="radio" name="level" value="${l}" ${i===0?'checked':''}>${levelName(l)}</label>`).join('')}</div></fieldset><label class="field">${t('付款方式','Payment Method')}<select name="paymentMode" id="bookingPayment"><option value="single">${t('单次 · $40','Single visit · $40')}</option><option value="package10">${t('购买10次套餐 · $350','Buy 10 visits · $350')}</option><option value="use_package" ${!eligible.length?'disabled':''}>${t('使用已有 / 共享套餐','Use Own / Shared Package')}</option></select></label><label class="field" id="bookingPackageField" hidden>${t('使用哪个套餐','Select Package')}<select name="packageId">${eligible.map(p=>`<option value="${p.id}">${esc(p.ownerName)} · ${p.remaining} ${t('次剩余','visits left')}</option>`).join('')}</select></label><button type="submit" class="primary" ${e?.status!=='open'?'disabled':''}>${t('确认报名','Register')}</button></form>`}
  <p class="subtle" style="margin-top:18px">${e?.venue.levelCapacity?t('每等级最多4人，总名额12人。','Up to 4 players per division, 12 total.'):t('四个等级共享32个名额。','32 places shared across all divisions.')}</p></section></div>`;
}
function bookingCard(b){
  const p=state.profile.payments.find(p=>p.booking_id===b.id&&p.status!=='refunded'),event=state.events.find(e=>e.id===b.event_id);
  const attended=state.profile.attendance.some(a=>a.event_id===b.event_id&&!a.reversed_at);
  return `<div class="stack"><div>${badge(b.status)} <strong>${levelName(b.level)}</strong></div><p class="subtle">${esc(b.date||event?.date)} · ${venueName(b.venue_id||event?.venue_id)}</p>
  ${p?`<div>${badge(p.status)} · ${p.plan==='package10'?t('10次套餐','10-Visit Package'):t('单次','Single Visit')} · ${money(p.amount_cents)}</div>`:b.payment_mode==='use_package'?`<p>${t('使用已有套餐 · 实际到场后扣次','Existing package · Deducted after attendance')}</p>`:`<div class="notice">${t('模拟转账，请勿支付真实款项。','Simulated transfer. Do not send real money.')}<br><code>payments-test@example.invalid</code></div>${action('submit-payment',b.id,t('模拟已转账，提交核实','Simulate Transfer & Submit'),`data-plan="${b.payment_mode}"`,'primary')}`}
  ${b.status!=='cancelled'&&event?.status==='open'&&!attended?`<div class="tools">${action('edit-level',b.id,t('修改等级','Edit Division'))}${action('cancel-booking',b.id,t('退出本场','Cancel Registration'),'','small danger')}</div>`:''}</div>`;
}
function accountView(){
  if(!state.user)return `${pageHead(t('我的账户','My Account'))}<div class="auth-empty"><h2>${t('登录会员账户','Member Sign In')}</h2>${action('auth','',t('登录 / 注册','Sign In / Register'),'','primary')}</div>`;
  const p=state.profile,owned=p.packages.filter(x=>x.isOwner),tabs=[['bookings',t('我的报名','Registrations')],['packages',t('套餐与共享','Packages & Sharing')],['payments',t('付款记录','Payments')],['attendance',t('到场记录','Attendance')],['settings',t('账户设置','Settings')]];
  let content='';
  if(state.tab==='bookings')content=table([t('活动','Session'),t('等级','Division'),t('状态','Status'),t('操作','Actions')],p.bookings.map(b=>[`${b.date}<div class="subtle">${venueName(b.venue_id)}</div>`,levelName(b.level),badge(b.status),bookingCard(b)]));
  if(state.tab==='packages')content=`<div class="package-grid">${p.packages.map(x=>packageCard(x)).join('')||`<p class="empty">${t('暂无套餐','No packages yet')}</p>`}</div>`;
  if(state.tab==='payments')content=paymentsTable(p.payments,false);
  if(state.tab==='attendance')content=table([t('日期','Date'),t('场地','Venue'),t('方式','Method'),t('状态','Status')],p.attendance.map(a=>[a.date,venueName(a.venue_id),a.package_id?t('套餐到场','Package Attendance'):t('单次到场','Single Visit'),a.reversed_at?t('已撤销','Reversed'):t('已确认到场','Attendance Confirmed')]));
  if(state.tab==='settings')content=`<div class="split"><section><h2>${t('个人资料','Profile')}</h2><form id="profileForm" class="stack"><label class="field">${t('用户名','Username')}<input value="${esc(state.user.username)}" readonly></label><label class="field">${t('显示姓名','Display Name')}<input name="displayName" value="${esc(state.user.displayName)}" required maxlength="40"></label><label class="field">${t('手机尾号4位','Last 4 Phone Digits')}<input name="phoneTail" value="${esc(state.user.phoneTail)}" required pattern="[0-9]{4}" maxlength="4" inputmode="numeric"></label><button class="primary">${t('保存资料','Save Profile')}</button></form><p class="subtle" style="margin-top:14px">ID: <code>${state.user.id}</code></p></section><section><h2>${t('修改密码','Change Password')}</h2><form id="passwordForm" class="stack"><label class="field">${t('原密码','Current Password')}<input type="password" name="oldPassword" autocomplete="current-password" required></label><label class="field">${t('新密码 · 至少10位','New Password · At Least 10 Characters')}<input type="password" name="password" autocomplete="new-password" minlength="10" maxlength="64" required></label><button>${t('修改并重新登录','Change & Sign In Again')}</button></form></section></div>`;
  return `${pageHead(esc(state.user.displayName),`@${esc(state.user.username)}`)}<div class="metrics"><div class="metric"><span>${t('确认到场','Confirmed Visits')}</span><strong>${p.attended}</strong></div><div class="metric"><span>${t('本人套餐剩余','Own Visits Remaining')}</span><strong>${owned.reduce((s,x)=>s+x.remaining,0)}</strong></div><div class="metric"><span>${t('可用共享套餐','Shared Packages')}</span><strong>${p.packages.filter(x=>!x.isOwner&&x.remaining>0).length}</strong></div><div class="metric"><span>${t('累计实付净额','Net Payments')}</span><strong>${money(p.received)}</strong></div></div><div class="tabs">${tabs.map(([key,label])=>action('account-tab',key,label,'',state.tab===key?'active':'')).join('')}</div>${content}
  <section class="band"><details><summary>${t('关联旧报名','Link a Legacy Registration')}</summary><form id="claimForm" class="tools" style="margin-top:16px"><select name="legacyId" required>${state.legacy.map(x=>`<option value="${x.id}">${esc(x.display_name)} · ${x.event_id.slice(0,10)}</option>`).join('')}</select><button ${!state.legacy.length?'disabled':''}>${t('申请关联','Request Linking')}</button></form>${p.claims.length?table([t('原报名','Legacy Record'),t('状态','Status')],p.claims.map(c=>[esc(c.display_name),badge(c.status)])):''}</details></section>`;
}
function packageCard(p,asAdmin=false){
  const canShare=p.isOwner||asAdmin;
  return `<article class="package"><div class="package-header"><div><h3>${esc(p.ownerName)}</h3><p class="subtle">${p.isOwner?t('我的10次套餐','My 10-Visit Package'):t('共享10次套餐','Shared 10-Visit Package')}</p><code>${p.id.slice(0,8)}</code></div><div class="package-balance">${p.remaining}<small>${t('次剩余','visits left')}</small></div></div><p class="subtle">${t('已使用','Used')} ${p.used} / ${p.purchased}</p>
  ${canShare?`<div>${p.shares.filter(g=>g.active).map(g=>`<div class="share-row"><span>${esc(g.display_name)} <small>@${esc(g.username)}</small></span>${action('revoke-share',p.id,t('取消共享','Revoke'),`data-username="${esc(g.username)}"`)}</div>`).join('')}</div><form class="share-form" data-package="${p.id}"><input name="username" placeholder="${t('共享给会员用户名','Member username')}" aria-label="${t('共享给会员用户名','Member username')}" required minlength="3" maxlength="32"><button>${t('授权共享','Share')}</button></form>`:''}
  <details><summary>${t('使用明细','Usage History')}</summary>${table([t('使用人','Player'),t('日期','Date'),t('次数','Visits')],p.uses.map(u=>[esc(u.attendee),u.created_at.slice(0,10),String(u.visits)]))}</details></article>`;
}
function paymentsTable(payments,asAdmin){return table([t('会员 / 项目','Member / Plan'),t('金额','Amount'),t('状态','Status'),t('操作','Actions')],payments.map(p=>[`${esc(p.display_name||state.user.displayName)}<div class="subtle">${p.plan==='package10'?t('10次套餐','10-Visit Package'):t('单次','Single Visit')} · ${p.created_at.slice(0,10)}</div>`,money(p.amount_cents),badge(p.status),asAdmin?`<div class="tools">${p.status==='pending'?`${action('verify-payment',p.id,t('确认模拟收款','Verify Test Payment'))}${action('correct-payment',p.id,p.plan==='single'?t('改成10次套餐','Change to Package'):t('改成单次','Change to Single'),`data-plan="${p.plan==='single'?'package10':'single'}"`)}`:p.status==='received'?action('refund-payment',p.id,t('整笔退款','Full Refund'),'','small danger'):''}</div>`:'—']));}
function adminView(){
  const a=state.admin,tabs=[['payments',t('收款核对','Payments')],['attendance',t('到场登记','Check-In')],['packages',t('套餐共享','Packages')],['claims',t('旧报名关联','Legacy Claims')],['audit',t('审计记录','Audit')]];
  let content='';
  if(state.adminTab==='payments')content=paymentsTable(a.payments,true);
  if(state.adminTab==='packages')content=`<div class="package-grid">${a.packages.map(p=>packageCard(p,true)).join('')}</div>`;
  if(state.adminTab==='attendance'){
    const bookings=a.bookings.filter(b=>b.event_id===state.eventId&&b.status!=='cancelled');
    content=`<div class="tools" style="margin-bottom:18px"><select id="adminEvent">${eventOptions()}</select>${action('archive-event',state.eventId,t('归档场次','Archive Session'),'','small danger')}</div>${table([t('会员','Member'),t('报名','Registration'),t('扣次套餐','Charge Package'),t('操作','Actions')],bookings.map(b=>{const attendance=a.attendance.find(x=>x.event_id===b.event_id&&x.member_id===b.member_id&&!x.reversed_at);const available=a.packages.filter(p=>p.remaining>0&&(p.owner_id===b.member_id||p.shares.some(g=>g.id===b.member_id&&g.active)));const preferred=b.package_id||available.find(p=>p.owner_id===b.member_id)?.id;return [esc(b.display_name),`${badge(b.status)}<div class="subtle">${levelName(b.level)}</div>`,`<select id="charge-${b.id}" ${attendance?'disabled':''}><option value="">${t('已付款单次','Paid Single Visit')}</option>${available.map(p=>`<option value="${p.id}" ${p.id===preferred?'selected':''}>${esc(p.ownerName)} · ${p.remaining}</option>`).join('')}</select>`,attendance?`<div class="tools">${badge('checked_in')}${action('reverse-attendance',attendance.id,t('撤销到场','Reverse Check-In'),'','small danger')}</div>`:action('check-in',b.id,t('确认到场','Confirm Attendance'),`data-member="${b.member_id}" ${b.status!=='joined'?'disabled':''}`)];}))}`;
  }
  if(state.adminTab==='claims')content=table([t('旧名单','Legacy'),t('申请会员','Applicant'),t('状态','Status'),t('操作','Actions')],a.claims.map(c=>[esc(c.old_name),`${esc(c.requester)}<div class="subtle">@${esc(c.username)}</div>`,badge(c.status),c.status==='pending'?`<div class="tools">${action('approve-claim',c.id,t('核实后关联','Approve Linking'))}${action('reject-claim',c.id,t('拒绝','Reject'),'','small danger')}</div>`:'—']));
  if(state.adminTab==='audit')content=`<div class="tools"><a href="/api/admin/export">${t('导出测试数据','Export Test Data')}</a><label>${t('旧账本迁移预检','Legacy Ledger Dry Run')} <input type="file" id="migrationFile" accept=".json,application/json"></label></div><div id="migrationResult" class="notice" hidden></div><div class="audit-list">${a.audit.map(x=>`<div>${esc(x.created_at)} · <strong>${esc(x.action)}</strong><br><code>${esc(x.target_id||'')}</code></div>`).join('')}</div>`;
  return `${pageHead(t('管理中心','Admin Workspace'),t('模拟收款、到场和套餐共享','Test payments, attendance and package sharing'))}<div class="metrics"><div class="metric"><span>${t('累计实收净额','Net Receipts')}</span><strong>${money(a.ledger.reduce((s,x)=>s+x.amount_cents,0))}</strong></div><div class="metric"><span>${t('待核实收款','Pending Payments')}</span><strong>${a.payments.filter(x=>x.status==='pending').length}</strong></div><div class="metric"><span>${t('套餐剩余次数','Package Visits Left')}</span><strong>${a.packages.reduce((s,x)=>s+x.remaining,0)}</strong></div><div class="metric"><span>${t('确认到场','Confirmed Attendance')}</span><strong>${a.attendance.filter(x=>!x.reversed_at).length}</strong></div></div><div class="tabs">${tabs.map(([key,label])=>action('admin-tab',key,label,'',state.adminTab===key?'active':'')).join('')}</div>${content}`;
}
function openAuth(mode='login'){
  state.authMode=mode;$('authTitle').textContent=t('会员账户','Member Account');$('authError').textContent='';
  $('authTabs').innerHTML=[['login',t('登录','Sign In')],['register',t('注册','Register')],['recover',t('找回密码','Recover')]].map(([key,label])=>`<button type="button" data-auth-mode="${key}" class="${mode===key?'active':''}">${label}</button>`).join('');
  $('authForm').innerHTML=`<label class="field">${t('用户名','Username')}<input name="username" autocomplete="username" minlength="3" maxlength="32" pattern="[a-zA-Z0-9_]+" required></label>${mode==='register'?`<label class="field">${t('显示姓名','Display Name')}<input name="displayName" maxlength="40" required></label><label class="field">${t('手机尾号4位','Last 4 Phone Digits')}<input name="phoneTail" pattern="[0-9]{4}" maxlength="4" inputmode="numeric" required></label>`:''}${mode==='recover'?`<label class="field">${t('私密恢复码','Private Recovery Code')}<input name="recoveryCode" autocomplete="off" required maxlength="80"></label>`:''}<label class="field">${mode==='login'?t('密码','Password'):t('设置密码 · 至少10位','Password · At Least 10 Characters')}<input name="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" minlength="${mode==='login'?1:10}" maxlength="64" required></label><button class="primary" type="submit">${mode==='login'?t('登录','Sign In'):mode==='register'?t('创建账户','Create Account'):t('重置密码','Reset Password')}</button>`;
  if(!$('authDialog').open)$('authDialog').showModal();
}
function showRecovery(code){$('recoveryTitle').textContent=t('保存私密恢复码','Save Your Recovery Code');$('recoveryNotice').textContent=t('仅显示这一次。忘记密码时可用它自行恢复账户，请勿分享。','Shown once. Keep it private; use it to recover your account if you forget your password.');$('recoveryCode').textContent=code;$('copyRecovery').textContent=t('复制','Copy');$('closeRecovery').textContent=t('已保存','Saved');$('recoveryDialog').showModal();}
let confirmResolve=null;
function confirmAction(title,body){$('confirmTitle').textContent=title;$('confirmBody').textContent=body;$('cancelConfirm').textContent=t('取消','Cancel');$('acceptConfirm').textContent=t('确认','Confirm');$('confirmDialog').showModal();return new Promise(resolve=>confirmResolve=resolve);}
function finishConfirm(value){const resolve=confirmResolve;confirmResolve=null;$('confirmDialog').close();resolve?.(value);}
$('cancelConfirm').onclick=()=>finishConfirm(false);$('acceptConfirm').onclick=()=>finishConfirm(true);$('confirmDialog').addEventListener('cancel',event=>{event.preventDefault();finishConfirm(false);});
$('copyRecovery').onclick=async()=>{try{await navigator.clipboard.writeText($('recoveryCode').textContent);toast(t('已复制','Copied'));}catch(_){toast(t('请选中恢复码保存','Select and retain the recovery code'));}};
$('closeRecovery').onclick=()=>{$('recoveryDialog').close();$('recoveryCode').textContent='';};
$('identityButton').onclick=()=>state.user?(state.view='account',render()):openAuth();
for(const [button,lang] of [[$('zhButton'),'zh'],[$('enButton'),'en']])button.onclick=()=>{language=lang;localStorage.setItem('dove_sandbox_language',lang);render();};
document.addEventListener('click',async event=>{
  const close=event.target.closest('[data-close]');if(close)$(close.dataset.close).close();
  const authMode=event.target.closest('[data-auth-mode]');if(authMode){openAuth(authMode.dataset.authMode);return;}
  const view=event.target.closest('[data-view]');if(view){event.preventDefault();state.view=view.dataset.view;history.pushState({},'',view.getAttribute('href'));render();return;}
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const {action:kind,id}=button.dataset;
  if(kind==='auth'){openAuth();return;}
  if(kind==='account-tab'){state.tab=id;render();return;}
  if(kind==='admin-tab'){state.adminTab=id;render();return;}
  if(state.busy)return;
  try{
    if(kind==='refresh'){await refresh();return;}
    if(kind==='choose-event'){state.eventId=id;state.roster=await api(`/events/${id}/roster`);render();return;}
    if(kind==='logout'){await api('/auth/logout','POST',{});state.user=null;await refresh();return;}
    if(kind==='edit-level'){
      const b=state.profile.bookings.find(b=>b.id===id);$('levelTitle').textContent=t('修改报名等级','Edit Division');$('levelForm').innerHTML=`<input type="hidden" name="bookingId" value="${id}"><label class="field">${t('等级','Division')}<select name="level">${['u20','25_30','30_plus','35_plus'].map(l=>`<option value="${l}" ${l===b.level?'selected':''}>${levelName(l)}</option>`).join('')}</select></label><button class="primary" style="margin-top:18px">${t('保存','Save')}</button>`;$('levelDialog').showModal();return;
    }
    if(kind==='cancel-booking'&&!await confirmAction(t('退出本场','Cancel Registration'),t('保留原付款记录，不自动扣次或退款。','Payment records stay intact. No automatic visit deduction or refund.')))return;
    if(kind==='verify-payment'&&!await confirmAction(t('确认模拟收款','Verify Test Payment'),t('仅测试数据：确认这笔收款后，套餐购买会增加10次。','Test data only. Verifying a package purchase credits 10 visits.')))return;
    if(kind==='refund-payment'&&!await confirmAction(t('整笔退款','Full Refund'),t('保留原收款并追加退款流水；已扣次的套餐必须先撤销到场。','Keep the original receipt and append a refund. Used package visits must be reversed first.')))return;
    if(kind==='check-in'&&!await confirmAction(t('确认实际到场','Confirm Attendance'),t('只登记实际来的人。使用套餐时扣1次，不新增收入。','Check in only the person who attended. Package use deducts one visit without new income.')))return;
    if(kind==='reverse-attendance'&&!await confirmAction(t('撤销到场','Reverse Attendance'),t('原记录保留，次数返还原套餐持有人。','Retain the original entry and return the visit to the original package.')))return;
    if(kind==='archive-event'&&!await confirmAction(t('归档场次','Archive Session'),t('归档只锁定报名，不会把报名自动计为到场。','Archiving locks registrations. It does not create attendance records.')))return;
    if(kind==='approve-claim'&&!await confirmAction(t('关联旧报名','Link Legacy Registration'),t('请先独立核实此人身份，不能只凭姓名或手机尾号。','Verify the person independently. Names or phone endings alone are not proof.')))return;
    state.busy=true;button.disabled=true;
    if(kind==='cancel-booking')await api(`/bookings/${id}/cancel`,'POST',{});
    if(kind==='submit-payment')await api('/payments','POST',{bookingId:id,plan:button.dataset.plan});
    if(kind==='verify-payment')await api(`/admin/payments/${id}/verify`,'POST',{confirmed:true});
    if(kind==='correct-payment')await api(`/admin/payments/${id}/correct`,'POST',{plan:button.dataset.plan});
    if(kind==='refund-payment')await api(`/admin/payments/${id}/refund`,'POST',{confirmed:true});
    if(kind==='check-in')await api('/admin/attendance','POST',{eventId:state.eventId,memberId:button.dataset.member,packageId:$(`charge-${id}`).value||null,confirmed:true});
    if(kind==='reverse-attendance')await api(`/admin/attendance/${id}/reverse`,'POST',{});
    if(kind==='revoke-share')await api(`/packages/${id}/share`,'POST',{username:button.dataset.username,active:false});
    if(kind==='archive-event')await api(`/admin/events/${id}/archive`,'POST',{});
    if(kind==='approve-claim'||kind==='reject-claim')await api(`/admin/claims/${id}`,'POST',{approved:kind==='approve-claim'});
    await refresh();toast(t('已保存','Saved'));
  }catch(error){toast(errorText(error));button.disabled=false;}finally{state.busy=false;}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();if(state.busy)return;
  const input=Object.fromEntries(new FormData(form)),submit=form.querySelector('[type=submit],button:not([type])');state.busy=true;if(submit)submit.disabled=true;
  try{
    if(form.id==='authForm'){
      const result=await api(`/auth/${state.authMode}`,'POST',input);state.user=result.user;state.csrf=result.csrf;$('authDialog').close();await refresh();if(result.recoveryCode)showRecovery(result.recoveryCode);return;
    }
    if(form.id==='bookingForm')await api('/bookings','POST',{...input,eventId:state.eventId});
    if(form.id==='profileForm')await api('/me','PATCH',input);
    if(form.id==='passwordForm'){await api('/auth/password','POST',input);await refresh();openAuth();return;}
    if(form.id==='levelForm'){await api(`/bookings/${input.bookingId}`,'PATCH',{level:input.level});$('levelDialog').close();}
    if(form.id==='claimForm')await api('/claims','POST',input);
    if(form.matches('.share-form'))await api(`/packages/${form.dataset.package}/share`,'POST',{username:input.username,active:true});
    await refresh();toast(t('已保存','Saved'));
  }catch(error){if(form.id==='authForm')$('authError').textContent=errorText(error);else toast(errorText(error));}finally{state.busy=false;if(submit)submit.disabled=false;}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  if(el.id==='bookingPayment')$('bookingPackageField').hidden=el.value!=='use_package';
  try{
    if(el.id==='eventDate'){const venue=currentEvent()?.venue_id||'mrtc';state.eventId=state.events.find(e=>e.date===el.value&&e.venue_id===venue).id;state.roster=await api(`/events/${state.eventId}/roster`);render();}
    if(el.id==='adminEvent'){state.eventId=el.value;render();}
    if(el.id==='migrationFile'&&el.files[0]){if(el.files[0].size>128000)throw new Error(t('预检文件过大','Preview file too large'));const raw=JSON.parse(await el.files[0].text());const result=await api('/admin/migration-preview','POST',{entries:raw.entries||raw});$('migrationResult').hidden=false;$('migrationResult').textContent=t(`预检 ${result.rows.length} 条，写入0条，需核实后再迁移。`,`Previewed ${result.rows.length} rows, 0 writes. Verification is required before migration.`);}
  }catch(error){toast(errorText(error));}
});
window.addEventListener('popstate',()=>{state.view=location.pathname==='/finance.html'?'admin':location.pathname==='/account.html'?'account':'sessions';render();});
window.addEventListener('focus',()=>{if(!state.busy&&!document.querySelector('dialog[open]')&&!document.activeElement?.closest('form'))refresh().catch(e=>toast(errorText(e)));});
setInterval(()=>{if(!document.hidden&&!state.busy&&!document.querySelector('dialog[open]')&&!document.activeElement?.closest('form'))refresh().catch(()=>{});},15000);
refresh().then(()=>{if(location.pathname==='/login.html')openAuth();}).catch(error=>{$('app').innerHTML=`<div class="notice">${esc(errorText(error))}</div>`;});
