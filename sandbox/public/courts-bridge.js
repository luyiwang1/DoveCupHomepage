/* The live court UI uses this local adapter instead of any production connection. */
window.DoveSandboxReady=(async()=>{
  const boot=await (await fetch('/api/bootstrap')).json();window.DoveSandboxUser=boot.user;
  const events=await(await fetch('/api/events')).json(),params=new URLSearchParams(location.search),venue=params.get('venue')==='nyta-east'?'nyta-east':'mrtc';
  const selected=events.find(e=>e.id===params.get('event')&&e.venue_id===venue)||events.find(e=>e.venue_id===venue&&e.status==='open')||events.find(e=>e.venue_id===venue);
  let revision=0;const listeners=new Set();
  async function read(path,signal){
    const requested=path.includes('/nyta-east/')?'nyta-east':'mrtc';
    if(requested!==venue)throw new Error('Venue mismatch');
    const layout=path.endsWith('/courtsPage'),response=await fetch(`/api/events/${encodeURIComponent(selected.id)}/${layout?'courts':'court-roster'}`,{signal});
    if(!response.ok)throw new Error('Unable to load sandbox court data');
    const result=await response.json();if(layout){revision=result.revision;return result.data;}return result;
  }
  let writing=false;
  async function set(path,data){if(writing)throw new Error('Save in progress');writing=true;try{const response=await fetch(`/api/events/${encodeURIComponent(selected.id)}/courts`,{method:'PUT',headers:{'Content-Type':'application/json','X-CSRF-Token':boot.csrf},body:JSON.stringify({data,revision})});const result=await response.json();if(!response.ok)throw new Error(result.error);revision=result.revision;return result;}finally{writing=false;}}
  function ref(path){return {on(_event,callback,onError){const listener={path,callback,onError};listeners.add(listener);read(path).then(data=>callback({val:()=>data})).catch(onError||console.error);},set:data=>set(path,data)};}
  window.DoveSandboxCourt={read};window.firebase={apps:[{}],initializeApp(){},database:()=>({ref})};
  setInterval(()=>{if(document.hidden||writing)return;for(const l of listeners)read(l.path).then(data=>l.callback({val:()=>data})).catch(l.onError||console.error);},15000);
  function mount(){
    const bar=document.createElement('div');bar.style.cssText='margin:12px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
    const label=document.createElement('label');label.textContent='测试场次 / Test Session';label.htmlFor='sandboxCourtEvent';const select=document.createElement('select');select.id='sandboxCourtEvent';select.style.cssText='font:inherit;padding:8px;border:1px solid #bbc8bb;border-radius:6px';
    for(const e of events.filter(e=>e.venue_id===venue)){const option=document.createElement('option');option.value=e.id;option.textContent=e.date+(e.status==='archived'?' · Archived':'');option.selected=e.id===selected.id;select.append(option);}
    select.onchange=()=>{params.set('event',select.value);location.search=params.toString();};bar.append(label,select);document.querySelector('main')?.prepend(bar);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  return boot;
})();
