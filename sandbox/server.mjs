import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDomain, AppError, publicMember, text } from './domain.mjs';
import { createOperations } from './operations.mjs';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
class SQLiteSessionStore extends session.Store {
  constructor(domain){super();this.domain=domain;}
  get(key,callback){try{const row=this.domain.get('SELECT * FROM sessions WHERE id=?',key);if(!row||row.expires<Date.now()){if(row)this.domain.run('DELETE FROM sessions WHERE id=?',key);callback(null,null);}else callback(null,JSON.parse(row.value));}catch(e){callback(e);}}
  set(key,value,callback=()=>{}){try{this.domain.run('INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,expires=excluded.expires',key,JSON.stringify(value),value.cookie?.expires?Date.parse(value.cookie.expires):Date.now()+30*86400000);callback();}catch(e){callback(e);}}
  destroy(key,callback=()=>{}){try{this.domain.run('DELETE FROM sessions WHERE id=?',key);callback();}catch(e){callback(e);}}
  touch(key,value,callback){this.set(key,value,callback);}
}
const token=()=>randomBytes(32).toString('base64url');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const saveSession=req=>new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
const regenerate=req=>new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));

export async function createApp({database=':memory:',seed=true,secret=token(),test=false}={}){
  const domain=await createDomain(database,{seed}),app=express();
  const operations=createOperations(domain);
  app.disable('x-powered-by');
  app.use((req,res,next)=>{
    if(!['localhost','127.0.0.1','::1','[::1]'].includes(req.hostname))return res.status(403).json({error:'sandbox_host_only'});
    res.set('X-Dove-Environment','isolated-member-sandbox');next();
  });
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'","'unsafe-inline'"],scriptSrcAttr:["'unsafe-inline'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:'],mediaSrc:["'self'"],fontSrc:["'self'",'data:'],connectSrc:["'self'"],formAction:["'self'"],frameAncestors:["'none'"],upgradeInsecureRequests:null}},crossOriginEmbedderPolicy:false}));
  app.use(express.json({limit:'128kb',type:'application/json'}));
  app.use(session({name:'dove_sandbox_session',secret,store:new SQLiteSessionStore(domain),resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,sameSite:'lax',secure:false,maxAge:30*86400000}}));
  const authLimiter=rateLimit({windowMs:15*60000,limit:test?10000:20,standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,res)=>res.status(429).json({error:'too_many_attempts'})});
  app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.use('/api',(req,res,next)=>{
    if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
    if(req.get('origin')){try{if(new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'csrf_invalid'});}catch(_){return res.status(403).json({error:'csrf_invalid'});}}
    if(!equal(req.get('x-csrf-token'),req.session.csrf))return res.status(403).json({error:'csrf_invalid'});
    next();
  });
  const login=(req,res,next)=>{const u=req.session.userId&&domain.member(req.session.userId);if(!u||req.session.authVersion!==u.auth_version)return res.status(401).json({error:'login_required'});req.user=u;next();};
  const admin=(req,res,next)=>login(req,res,()=>req.user.role==='admin'?next():res.status(403).json({error:'admin_required'}));
  async function establish(req,result){await regenerate(req);req.session.userId=result.user.id;req.session.authVersion=domain.member(result.user.id).auth_version;req.session.csrf=token();await saveSession(req);return {...result,csrf:req.session.csrf};}
  app.get('/api/bootstrap',async(req,res)=>{req.session.csrf||=token();const u=req.session.userId?domain.member(req.session.userId):null;const valid=u&&req.session.authVersion===u.auth_version;if(!valid)delete req.session.userId;await saveSession(req);res.json({environment:'sandbox',csrf:req.session.csrf,user:publicMember(valid?u:null)});});
  app.post('/api/auth/register',authLimiter,async(req,res)=>{res.status(201).json(await establish(req,await domain.register(req.body)));});
  app.post('/api/auth/login',authLimiter,async(req,res)=>res.json(await establish(req,{user:await domain.authenticate(req.body.username,req.body.password)})));
  app.post('/api/auth/recover',authLimiter,async(req,res)=>res.json(await establish(req,await domain.recover(req.body.username,req.body.recoveryCode,req.body.password))));
  app.post('/api/auth/logout',login,async(req,res)=>{await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()));res.clearCookie('dove_sandbox_session');res.json({ok:true});});
  app.post('/api/auth/password',authLimiter,login,async(req,res)=>{await domain.changePassword(req.user.id,req.body.oldPassword,req.body.password);await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()));res.clearCookie('dove_sandbox_session');res.json({ok:true});});
  app.get('/api/events',(_req,res)=>{if(!test)operations.archiveDue();res.json(domain.events());});
  app.get('/api/signup/:eventId',(req,res)=>res.json(operations.signupState(req.params.eventId,req.session.userId)));
  app.patch('/api/signup/bookings/:id/confirmation',login,(req,res)=>res.json(operations.confirmSignup(req.user.id,req.params.id,req.body.confirmed)));
  app.patch('/api/signup/bookings/:id/phone-tail',login,(req,res)=>res.json(operations.setPhoneTail(req.user.id,req.params.id,req.body.phoneTail)));
  app.post('/api/signup/bookings/:id/package',login,(req,res)=>res.json(operations.usePackage(req.user.id,req.params.id,req.body.packageId)));
  app.get('/api/events/:eventId/court-roster',(req,res)=>res.json(operations.roster(req.params.eventId)));
  app.get('/api/events/:eventId/courts',(req,res)=>res.json(operations.courts(req.params.eventId)));
  app.put('/api/events/:eventId/courts',admin,(req,res)=>res.json(operations.saveCourts(req.user.id,req.params.eventId,req.body.data,req.body.revision)));
  app.get('/api/attendance',(req,res)=>res.json(operations.attendance(req.query.venue)));
  app.get('/api/attendance-page',(_req,res)=>res.json(operations.attendancePage()));
  app.get('/api/singles',(req,res)=>res.json(operations.tournamentView(req.session.userId)));
  app.post('/api/singles',login,(req,res)=>res.json(operations.saveTournament(req.user.id,req.body)));
  app.get('/api/team',(req,res)=>res.json(operations.team(req.session.userId)));
  app.put('/api/team',login,(req,res)=>res.json(operations.saveTeam(req.user.id,req.body)));
  app.get('/api/events/:eventId/roster',(req,res)=>{res.json(domain.all("SELECT bookings.id,bookings.level,bookings.status,members.display_name FROM bookings JOIN members ON members.id=bookings.member_id WHERE bookings.event_id=? AND bookings.status!='cancelled' ORDER BY bookings.created_at",req.params.eventId).map(r=>({...r,mine:!!req.session.userId&&!!domain.get('SELECT id FROM bookings WHERE id=? AND member_id=?',r.id,req.session.userId)})));});
  app.get('/api/me',login,(req,res)=>res.json(operations.memberProfile(req.user.id)));
  app.patch('/api/me',login,(req,res)=>{const name=text(req.body.displayName,1,40),tail=text(req.body.phoneTail,4,4);if(!/^\d{4}$/.test(tail))throw new AppError('phone_tail',422);domain.run('UPDATE members SET display_name=?,phone_tail=? WHERE id=?',name,tail,req.user.id);res.json(publicMember(domain.member(req.user.id)));});
  app.post('/api/bookings',login,(req,res)=>res.status(201).json(domain.book(req.user.id,req.body)));
  app.patch('/api/bookings/:id',login,(req,res)=>res.json(domain.updateBooking(req.user.id,req.params.id,req.body)));
  app.post('/api/bookings/:id/cancel',login,(req,res)=>res.json(domain.cancel(req.user.id,req.params.id)));
  app.post('/api/admin/bookings',admin,(req,res)=>{if(!domain.member(req.body.memberId))throw new AppError('member_missing',404);const booking=domain.book(req.body.memberId,req.body);domain.run('INSERT INTO audit VALUES(?,?,?,?,?,?)',token(),req.user.id,'booking.admin_added',booking.id,'{}',new Date().toISOString());res.status(201).json(booking);});
  app.patch('/api/admin/bookings/:id',admin,(req,res)=>{const booking=domain.get('SELECT * FROM bookings WHERE id=?',req.params.id);if(!booking)throw new AppError('booking_missing',404);const changed=domain.updateBooking(booking.member_id,booking.id,req.body);domain.run('INSERT INTO audit VALUES(?,?,?,?,?,?)',token(),req.user.id,'booking.admin_edited',booking.id,'{}',new Date().toISOString());res.json(changed);});
  app.post('/api/payments',login,(req,res)=>res.status(201).json(domain.submitPayment(req.user.id,req.body.bookingId,req.body.plan)));
  app.post('/api/packages/:id/share',login,(req,res)=>res.json(domain.share(req.user.id,req.params.id,req.body.username,req.body.active!==false)));
  app.get('/api/legacy',login,(_req,res)=>res.json(domain.legacy()));
  app.post('/api/claims',login,(req,res)=>res.status(201).json(domain.claim(req.user.id,text(req.body.legacyId))));
  app.get('/api/admin',admin,(req,res)=>{const data=domain.adminData(req.user.id);data.specialEvents=operations.specialEvents();data.attendance.push(...domain.all('SELECT special_attendance.*,members.display_name FROM special_attendance JOIN members ON members.id=member_id'));res.json(data);});
  app.post('/api/admin/special-attendance',admin,(req,res)=>{if(req.body.confirmed!==true)throw new AppError('confirmation_required',422);res.json(operations.specialCheckIn(req.user.id,req.body.eventId,req.body.memberId));});
  app.post('/api/admin/special-attendance/:id/reverse',admin,(req,res)=>res.json(operations.reverseSpecial(req.user.id,req.params.id)));
  app.post('/api/admin/payments/:id/verify',admin,(req,res)=>{if(req.body.confirmed!==true)throw new AppError('confirmation_required',422);res.json(domain.verifyPayment(req.user.id,req.params.id));});
  app.post('/api/admin/payments/:id/correct',admin,(req,res)=>res.json(domain.correctPayment(req.user.id,req.params.id,req.body.plan)));
  app.post('/api/admin/payments/:id/refund',admin,(req,res)=>{if(req.body.confirmed!==true)throw new AppError('confirmation_required',422);res.json(domain.refund(req.user.id,req.params.id));});
  app.post('/api/admin/attendance',admin,(req,res)=>{if(req.body.confirmed!==true)throw new AppError('confirmation_required',422);res.status(201).json(domain.checkIn(req.user.id,req.body));});
  app.post('/api/admin/attendance/:id/reverse',admin,(req,res)=>res.json(domain.reverseAttendance(req.user.id,req.params.id)));
  app.post('/api/admin/claims/:id',admin,(req,res)=>{domain.approveClaim(req.user.id,req.params.id,req.body.approved===true);res.json({ok:true});});
  app.post('/api/admin/events/:id/archive',admin,(req,res)=>{domain.tx(()=>{const e=domain.get('SELECT * FROM events WHERE id=?',req.params.id);if(!e)throw new AppError('event_missing',404);domain.run("UPDATE events SET status='archived' WHERE id=?",e.id);domain.run('INSERT INTO audit VALUES(?,?,?,?,?,?)',token(),req.user.id,'event.archived',e.id,'{}',new Date().toISOString());});res.json({ok:true});});
  app.get('/api/admin/export',admin,(req,res)=>res.attachment('dove-sandbox-export.json').json({environment:'sandbox',exportedAt:new Date().toISOString(),data:domain.adminData(req.user.id),operations:domain.all('SELECT id,data,revision FROM operation_documents')}));
  app.post('/api/admin/migration-preview',admin,(req,res)=>{
    if(!Array.isArray(req.body.entries)||req.body.entries.length>500||req.body.entries.some(entry=>!entry||typeof entry!=='object'))throw new AppError('invalid_input',422);
    const rows=req.body.entries.map(entry=>({name:typeof entry.name==='string'?entry.name.slice(0,80):'',type:entry.type,amountCents:Number(entry.amountCents)||0,visits:Number(entry.visits)||0,memberMatches:domain.all('SELECT id,username,display_name FROM members WHERE display_name=?',String(entry.name||'')),status:'review_required'}));
    res.json({dryRun:true,writes:0,rows,notice:'No production data or legacy appearance counts are imported automatically.'});
  });
  app.use('/api',(_req,res)=>res.status(404).json({error:'not_found'}));
  app.use('/staging',express.static(resolve(here,'public'),{dotfiles:'deny',index:false}));
  app.get('/language.js',(_req,res)=>res.type('js').sendFile(resolve(here,'live-signup/language.js')));
  app.get('/venue-config.js',(_req,res)=>res.type('js').sendFile(resolve(here,'live-signup/venue-config.js')));
  function sourceHtml(name){let html=readFileSync(resolve(root,name),'utf8');return html.replace('</head>','<link rel="stylesheet" href="/staging/shell.css"></head>').replace('</body>','<script src="/staging/shell.js" defer></script></body>');}
  app.get(['/', '/index.html'],(_req,res)=>res.type('html').send(sourceHtml('index.html')));
  app.get(['/events.html','/moments.html'],(req,res)=>res.type('html').send(sourceHtml(req.path.slice(1))));
  app.get('/live.html',(req,res)=>res.redirect('/courts.html'+(req.url.includes('?')?req.url.slice(req.url.indexOf('?')):'')));
  app.get('/team-event.html',(_req,res)=>{
    let html=sourceHtml('team-event.html').replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^\"]+"><\/script>/g,'');
    html=html.replace('<script src="language.js','<script src="/staging/team-bridge.js"></script><script src="language.js');
    const start=html.lastIndexOf('start();');
    if(start<0)throw new Error('Team page startup marker missing');
    html=html.slice(0,start)+`window.DoveSandboxReady.then(()=>{ownerKey=window.DoveSandboxUser?.id||'';isAdminMode=window.DoveSandboxUser?.role==='admin';const originalSync=syncPairingsFromRoster;syncPairingsFromRoster=raw=>{if(isAdminMode)originalSync(raw)};toggleAdmin=()=>{if(window.DoveSandboxUser?.role!=='admin'){location.href='/account.html?next=/team-event.html';return}isAdminMode=!isAdminMode;renderAll()};const originalJoin=submitRegistration;submitRegistration=()=>{if(!window.DoveSandboxUser){location.href='/account.html?next=/team-event.html';return}if(!isAdminMode)document.getElementById('joinName').value=window.DoveSandboxUser.displayName;originalJoin()};start()});`+html.slice(start+8);
    res.type('html').send(html);
  });
  app.get('/singles-championship.html',(_req,res)=>{
    let html=sourceHtml('singles-championship.html').replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^\"]+"><\/script>/g,'');
    html=html.replace('<script src="language.js','<script src="/staging/singles-bridge.js"></script><script src="language.js');
    html=html.replace('const currentSignupOwner=signupOwnerKey();',"let currentSignupOwner='';");
    const start=html.lastIndexOf('start();');if(start<0)throw new Error('Singles page startup marker missing');
    html=html.slice(0,start)+`window.DoveSandboxReady.then(()=>{currentSignupOwner=window.DoveSandboxUser?.id||'';isAdminMode=window.DoveSandboxUser?.role==='admin';openAdminLogin=()=>{if(window.DoveSandboxUser?.role==='admin'){isAdminMode=true;renderAll();return}location.href='/account.html?next=/singles-championship.html'};const originalJoin=joinSignup;joinSignup=event=>{if(!window.DoveSandboxUser){event.preventDefault();location.href='/account.html?next=/singles-championship.html';return}document.getElementById('signupName').value=window.DoveSandboxUser.displayName;return originalJoin(event)};start()});`+html.slice(start+8);
    res.type('html').send(html);
  });
  app.get('/courts.html',(_req,res)=>{
    let html=sourceHtml('courts.html');
    html=html.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^\"]+"><\/script>/g,'');
    html=html.replace('renderVenueSwitch();renderAdmin();loadRealtimeData();',`window.DoveSandboxReady.then(()=>{isAdminMode=window.DoveSandboxUser?.role==='admin';fetchJson=(path,signal)=>window.DoveSandboxCourt.read(path,signal);toggleAdmin=()=>{if(window.DoveSandboxUser?.role!=='admin'){location.href='/account.html?next='+encodeURIComponent(location.pathname+location.search);return}isAdminMode=!isAdminMode;renderAdmin();render()};renderVenueSwitch();renderAdmin();loadRealtimeData()});`);
    html=html.replace('<script src="language.js','<script src="/staging/courts-bridge.js"></script><script src="language.js');
    res.type('html').send(html);
  });
  app.get('/signup.html',(_req,res)=>{
    let html=readFileSync(resolve(here,'live-signup/signup.html'),'utf8');
    html=html.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^\"]+"><\/script>/g,'');
    const startup=/load\(\);\s*render\(\);\s*initRealtimeDatabase\(\);\s*<\/script>/;
    if(!startup.test(html))throw new Error('Signup startup marker missing');
    html=html.replace(startup,'</script><script src="/staging/signup-live-runtime.js"></script>');
    html=html.replace('</head>','<link rel="stylesheet" href="/staging/signup-live.css"></head>');
    res.type('html').send(html);
  });
  app.get('/scores.html',(_req,res)=>{
    let html=readFileSync(resolve(here,'live-signup/scores.html'),'utf8').replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/[^\"]+"><\/script>/g,'');
    const startup=html.lastIndexOf('start();');if(startup<0)throw new Error('Attendance startup marker missing');
    html=html.slice(0,startup)+html.slice(startup+8);
    html=html.replace('</head>','<link rel="stylesheet" href="/staging/scores-live.css"></head>').replace('</body>','<script src="/staging/scores-live-runtime.js"></script></body>');
    res.type('html').send(html);
  });
  app.get(['/account.html','/login.html','/finance.html'],(_req,res)=>res.sendFile(resolve(here,'public','app.html')));
  app.use((req,res,next)=>{
    if(req.path.startsWith('/sandbox')||!['.js','.css','.webp','.jpg','.jpeg','.png','.svg','.mp4','.woff','.woff2'].includes(extname(req.path).toLowerCase()))return next();
    express.static(root,{dotfiles:'deny',index:false,fallthrough:true})(req,res,next);
  });
  app.use((_req,res)=>res.status(404).type('text').send('Sandbox route not found'));
  app.use((error,_req,res,_next)=>{if(error instanceof AppError)return res.status(error.status).json({error:error.code});if(error.type==='entity.parse.failed')return res.status(400).json({error:'invalid_json'});console.error('Sandbox error:',error.message);res.status(500).json({error:'server_error'});});
  return {app,domain};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(process.env.NODE_ENV==='production')throw new Error('This sandbox is not a production deployment.');
  const data=resolve(process.env.DOVE_SANDBOX_DATA||resolve(here,'.data'));mkdirSync(data,{recursive:true});
  const secretFile=resolve(data,'session.secret');if(!existsSync(secretFile))writeFileSync(secretFile,token(),{flag:'wx'});
  const {app,domain}=await createApp({database:resolve(data,'members.sqlite'),secret:readFileSync(secretFile,'utf8')});
  const port=Number(process.env.PORT||4187),server=app.listen(port,'127.0.0.1',()=>console.log(`DOVE SANDBOX http://127.0.0.1:${port}/ (independent database; production writes blocked)`));
  const shutdown=()=>server.close(()=>{domain.close();process.exit(0);});process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
