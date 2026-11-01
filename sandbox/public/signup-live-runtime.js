/* Keep the production markup/renderers; route every mutation to the member sandbox. */
(async function(){
  const english=()=>window.DoveLanguage?.getLanguage()==='en';
  const text=(zh,en)=>english()?en:zh;
  const params=new URLSearchParams(location.search);
  let boot=null,profile=null,adminData=null,selected=null,busy=false;
  const byId=id=>document.getElementById(id);
  const person=id=>[...state.joined,...state.waitlist].find(p=>p.id===id);
  const goLogin=()=>{location.href='/login.html?lang='+(english()?'en':'zh')+'&next='+encodeURIComponent(location.pathname+location.search)+'&intent=signup';};
  async function request(path,method='GET',data){const response=await fetch('/api'+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':boot.csrf}:{})},body:data?JSON.stringify(data):undefined});const result=await response.json();if(!response.ok)throw new Error(({login_required:text('请先登录会员账户','Please sign in'),not_owner:text('只能管理自己的报名','You can only manage your own registration'),already_booked:text('你已经报过本场','You are already registered'),no_visits:text('套餐剩余次数不足','No package visits remaining'),package_forbidden:text('未获授权使用该套餐','Package access not authorized'),event_closed:text('本场已归档','This session is archived'),waitlist_full:text('候补名额已满','Waitlist is full')})[result.error]||result.error);return result;}
  function accountNav(){
    const link=document.querySelector('.dove-site-register');if(link){link.href='/account.html?lang='+(english()?'en':'zh');link.textContent=boot.user?text('我的账户','My Account'):text('登录 / 注册','Sign In / Register');}
    byId('adminBtn').textContent=boot.user?.role==='admin'?text('管理中心','Admin Workspace'):text('管理员','Admin');
    let banner=document.querySelector('.staging-banner');if(!banner){banner=document.createElement('div');banner.className='staging-banner';document.body.prepend(banner);}banner.textContent=text('测试环境 · 独立数据库 · 请勿支付真实款项','TEST ENVIRONMENT · SEPARATE DATABASE · NO REAL PAYMENTS');
  }
  save=()=>{};load=()=>{};initRealtimeDatabase=()=>{};startAdminDataSync=()=>{};stopAdminDataSync=()=>{};
  ownsPerson=p=>!!boot?.user&&p.ownerKey===boot.user.id;
  canEditPerson=p=>isAdminMode||ownsPerson(p);
  currentSessionDate=()=>selected?.date||'';
  renderAdminHistory=()=>{const box=byId('adminHistoryContent');if(box)box.innerHTML=`<a href="/finance.html?lang=${english()?'en':'zh'}">${text('在管理中心查看报名历史与审计','View registration history and audit in Admin Workspace')}</a>`;};
  const originalVenuePicker=renderVenuePicker;
  renderVenuePicker=()=>{originalVenuePicker();byId('nextSessionNotice').textContent=text('下一场：','Next session: ')+(selected?.date||'');accountNav();};
  const originalOpenPayment=openPayment;
  openPayment=id=>{originalOpenPayment(id);const p=person(id);if(p?.paymentStatus==='package_pending'&&isAdminMode){byId('paymentSubmit').hidden=false;byId('paymentSubmit').textContent=text('核实套餐与到场','Review Package & Attendance');}byId('paymentEmail').value='payments-test@example.invalid';};
  DovePayments.email='payments-test@example.invalid';
  async function sync(){
    boot=await request('/bootstrap');currentUserKey=boot.user?.id||'';currentUserName=boot.user?.displayName||'';isAdminMode=boot.user?.role==='admin';
    const events=await request('/events');selected=events.find(e=>e.id===params.get('event')&&e.venue_id===VENUE_KEY)||events.find(e=>e.venue_id===VENUE_KEY&&e.status==='open')||events.find(e=>e.venue_id===VENUE_KEY);
    if(!selected)throw new Error('No test session available');
    const data=await request('/signup/'+encodeURIComponent(selected.id));state=data.state;idSeq=data.idSeq;remoteReady=true;
    profile=boot.user?await request('/me'):null;adminData=isAdminMode?await request('/admin'):null;
    render();accountNav();
  }
  async function perform(fn){if(busy)return;busy=true;try{await fn();await sync();}catch(error){showToast(error.message);}finally{busy=false;}}
  toggleAdmin=()=>{location.href='/finance.html?venue='+VENUE_KEY+'&lang='+(english()?'en':'zh');};
  submitAdminLogin=()=>toggleAdmin();
  openAttendance=()=>{location.href='/finance.html?venue='+VENUE_KEY+'&tab=attendance&lang='+(english()?'en':'zh');};
  editTitle=()=>toggleAdmin();setCapacity=()=>toggleAdmin();saveTitle=()=>toggleAdmin();
  promoteOne=()=>toggleAdmin();promoteAll=()=>toggleAdmin();autoPromote=()=>{};
  const originalShowAdd=showAddModal;
  showAddModal=()=>{
    if(!boot?.user){goLogin();return;}
    if(selected.status!=='open'){showToast(text('本场已归档','This session is archived'));return;}
    if(!isAdminMode&&[...state.joined,...state.waitlist].some(ownsPerson)){showToast(text('你已经报过本场','You are already registered'));return;}
    byId('addName').value=boot.user.displayName;byId('addName').readOnly=true;byId('addPhoneTail').value=boot.user.phoneTail;
    if(isAdminMode){let select=byId('sandboxAdminMember');if(!select){select=document.createElement('select');select.id='sandboxAdminMember';select.className='modal-input';select.setAttribute('aria-label','Member account');byId('addName').before(select);}select.innerHTML=adminData.members.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.displayName)} · @${escapeHtml(m.username)}</option>`).join('');select.value=boot.user.id;select.onchange=()=>{const member=adminData.members.find(m=>m.id===select.value);byId('addName').value=member.displayName;byId('addPhoneTail').value=member.phoneTail;};}
    originalShowAdd();
  };
  addPerson=list=>perform(async()=>{
    if(!boot.user){goLogin();return;}
    const tail=byId('addPhoneTail').value.trim();if(!/^\d{4}$/.test(tail))throw new Error(text('请输入手机尾号4位数字','Enter the last four phone digits'));
    const target=isAdminMode?byId('sandboxAdminMember').value:boot.user.id;
    if(target===boot.user.id&&tail!==boot.user.phoneTail)await request('/me','PATCH',{displayName:boot.user.displayName,phoneTail:tail});
    const booking=await request(isAdminMode?'/admin/bookings':'/bookings','POST',{eventId:selected.id,memberId:target,level:byId('addLevel').value,paymentMode:'single',preferWaitlist:list==='waitlist'});
    closeModalById('addModal');await sync();switchTab(booking.status==='joined'?'joined':'waitlist');
    const added=[...state.joined,...state.waitlist].find(p=>p.bookingId===booking.id);if(booking.status==='joined'&&target===boot.user.id&&added)openPayment(added.id);
    showToast(text('报名已保存','Registration saved'),'green');
  });
  toggleConfirm=id=>perform(async()=>{const p=person(id);if(!p)return;await request('/signup/bookings/'+p.bookingId+'/confirmation','PATCH',{confirmed:!p.confirmed});});
  savePhoneTail=()=>perform(async()=>{const p=phoneTailTarget&&person(phoneTailTarget.id);if(!p)return;await request('/signup/bookings/'+p.bookingId+'/phone-tail','PATCH',{phoneTail:byId('editPhoneTailInput').value.trim()});closeModalById('editPhoneTailModal');});
  requestExit=id=>{const p=person(id);if(!p||!canEditPerson(p))return;if(!confirm(text('确认退出本场报名？','Cancel this registration?')))return;perform(async()=>{await request('/bookings/'+p.bookingId+'/cancel','POST',{});showToast(text('已退出，付款记录保留','Registration cancelled; payment records retained'));});};
  removeJoined=id=>requestExit(id);removeFromWaitlist=id=>requestExit(id);
  togglePaid=id=>{const p=person(id);if(!p||!canEditPerson(p))return;if(p.paymentStatus==='received'&&isAdminMode){toggleAdmin();return;}openPayment(id);};
  submitTransfer=()=>perform(async()=>{
    const p=person(paymentTargetId);if(!p)return;
    if(p.paymentStatus==='package_pending'&&isAdminMode){openAttendance(p.id);return;}
    if(p.paymentStatus==='pending'){if(!isAdminMode)return;if(!confirm(text('确认已经核实这笔测试收款？','Verify this test payment?')))return;await request('/admin/payments/'+p.paymentId+'/verify','POST',{confirmed:true});}
    else if(byId('paymentPlan').value==='use_package'){
      const available=(profile?.packages||[]).filter(p=>p.remaining>0);if(!available.length)throw new Error(text('没有可用套餐，请联系管理员核实','No available package. Contact the administrator'));
      if(available.length>1){let select=byId('sandboxPackageChoice');if(!select){select=document.createElement('select');select.id='sandboxPackageChoice';select.className='modal-input';select.setAttribute('aria-label','Package');select.innerHTML=available.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.ownerName)} · ${p.remaining}</option>`).join('');byId('paymentPlan').after(select);showToast(text('请选择要使用的套餐后再次确认','Select a package and confirm again'));return;}}
      const chosen=byId('sandboxPackageChoice')?.value||available[0].id;await request('/signup/bookings/'+p.bookingId+'/package','POST',{packageId:chosen});
    }else await request('/payments','POST',{bookingId:p.bookingId,plan:byId('paymentPlan').value});
    closeModalById('paymentModal');showToast(text('已保存，待管理员核实','Saved for administrator verification'),'green');
  });
  document.body.classList.add('sandbox-live-signup');
  window.addEventListener('dove:languagechange',()=>requestAnimationFrame(accountNav));
  try{await sync();if(params.get('intent')==='signup'&&boot.user)showAddModal();}catch(error){byId('joinedList').textContent=error.message;console.error(error);}
  setInterval(()=>{if(!document.hidden&&!busy&&!document.querySelector('.modal-overlay.open'))sync().catch(error=>showToast(error.message));},15000);
  window.addEventListener('focus',()=>{if(!busy&&!document.querySelector('.modal-overlay.open'))sync().catch(()=>{});});
})();
