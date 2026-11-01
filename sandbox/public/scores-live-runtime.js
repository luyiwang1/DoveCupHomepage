(async function(){
  const english=()=>window.DoveLanguage?.getLanguage()==='en';
  const text=(zh,en)=>english()?en:zh;
  const adminUrl=()=>'/finance.html?tab=attendance&lang='+(english()?'en':'zh');
  let user=null,busy=false;
  async function read(path){const response=await fetch('/api'+path);if(!response.ok)throw new Error('Test data unavailable');return response.json();}
  function accountNav(){
    let banner=document.querySelector('.staging-banner');if(!banner){banner=document.createElement('div');banner.className='staging-banner';document.body.prepend(banner);}banner.textContent=text('测试环境 · 独立数据库 · 不影响正式到场记录','TEST ENVIRONMENT · SEPARATE DATABASE · NO LIVE ATTENDANCE CHANGES');
    const account=document.querySelector('.dove-site-register');if(account){account.href='/account.html?lang='+(english()?'en':'zh');account.textContent=user?text('我的账户','My Account'):text('登录 / 注册','Sign In / Register');}
    document.getElementById('adminBtn').textContent=text('管理中心','Admin Workspace');
    const subtitle=document.querySelector('.subtitle');subtitle.setAttribute('data-dove-no-translate','');subtitle.textContent=text('这里只记录管理员确认的实际到场次数，不记录胜局和积分。','Only administrator-confirmed attendance is counted, without wins or points.');
    const signupNote=document.querySelector('.signup-note');signupNote.setAttribute('data-dove-no-translate','');signupNote.textContent=text('MRTC 与 NYTA East 分别报名；报名与确认参加不会自动计为实际到场。','MRTC and NYTA East have separate registrations. Registration and participation confirmation do not count as attendance.');
    const empty=document.getElementById('emptyState');empty.setAttribute('data-dove-no-translate','');empty.textContent=text('还没有确认到场记录。管理员登记实际到场后，这里会自动显示。','No confirmed attendance yet. Records appear after an administrator checks players in.');
    const metricLabels=[text('到场人员','Players Attended'),text('累计到场','Total Attendances'),text('最多到场','Most Attendances'),text('已记录场次','Recorded Sessions')];document.querySelectorAll('.stat-card .label').forEach((label,index)=>{label.setAttribute('data-dove-no-translate','');label.textContent=metricLabels[index];});
    const count=document.getElementById('currentSignupCount'),total=['mrtc','nyta-east'].reduce((sum,key)=>sum+signupPlayers(key).length,0);count.setAttribute('data-dove-no-translate','');count.textContent=text(`${total} 人次`,`${total} registrations`);
    document.getElementById('syncStatus').textContent=text('两地到场记录实时同步中','Live attendance from both venues');
  }
  saveScores=()=>{};start=()=>{};
  formatDate=ts=>ts?new Intl.DateTimeFormat(english()?'en-CA':'zh-CN',{timeZone:'America/Toronto'}).format(new Date(ts)):'—';
  toggleAdmin=()=>{location.href=adminUrl();};
  importCurrentJoined=()=>toggleAdmin();addManualParticipation=()=>toggleAdmin();resetPlayer=()=>toggleAdmin();resetAllScores=()=>toggleAdmin();deletePlayerByKey=()=>toggleAdmin();deletePlayerFromButton=()=>toggleAdmin();
  renderSignupRows=people=>people.length?people.map((person,index)=>{const previous=scoreData.players[person.memberId],hasAttendance=Number(previous?.appearances)>0;return `<div class="current-signup-row"><span class="current-signup-index">${index+1}</span><span class="current-signup-name">${escapeHtml(person.name)}</span><span class="current-signup-level">${escapeHtml(signupLevelLabel(person))}</span><span class="signup-state ${hasAttendance?'previous':'first'}">${hasAttendance?text('有历史到场记录','Has Attendance History'):text('首次报名，待到场','First Registration · Awaiting Attendance')}</span></div>`;}).join(''):`<div class="empty">${text('本场次还没有人报名。','No registrations for this session.')}</div>`;
  async function sync(){if(busy)return;busy=true;try{
    const boot=await read('/bootstrap');user=boot.user;isAdminMode=user?.role==='admin';
    const data=await read('/attendance-page');scoreData=normalizeScoreData(data.scoreData);signupStates=data.signupStates;renderAdmin();render();
    const panel=document.querySelector('.panel.admin-control');panel.innerHTML=`<div class="panel-title">${text('管理员到场管理','Attendance Administration')}</div><div class="admin-grid"><button class="small-btn" type="button" onclick="toggleAdmin()">${text('登记与核对实际到场','Check In & Review Attendance')}</button></div><p class="note" style="margin-top:12px">${text('通过会员账户登记、撤销到场并核实套餐扣次，不直接删除历史流水。','Use member accounts to check in, reverse attendance and verify package deductions. History is retained.')}</p>`;
    document.querySelectorAll('.row-delete').forEach(button=>button.textContent=text('核对 / 更正','Review / Correct'));
    accountNav();
  }catch(error){document.getElementById('syncStatus').textContent=text('测试数据读取失败','Unable to load test data');console.error(error);}finally{busy=false;}}
  document.body.classList.add('sandbox-live-scores');
  window.addEventListener('dove:languagechange',()=>requestAnimationFrame(()=>sync()));
  await sync();setInterval(()=>{if(!document.hidden)sync();},15000);window.addEventListener('focus',sync);
})();
