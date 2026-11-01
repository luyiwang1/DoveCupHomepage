window.DoveSandboxReady=(async()=>{
  const boot=await(await fetch('/api/bootstrap')).json();window.DoveSandboxUser=boot.user;
  let cached=null;const listeners=new Set();
  async function load(){cached=await(await fetch('/api/singles')).json();return cached;}
  const snapshot=()=>({val:()=>cached?.data});
  function notify(){for(const callback of listeners)callback(snapshot());}
  async function commit(input){const response=await fetch('/api/singles',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':boot.csrf},body:JSON.stringify({...input,revision:cached?.revision||0})});const result=await response.json();if(!response.ok)throw new Error(result.error);cached=result;notify();return snapshot();}
  function ref(){return {on(_event,callback,onError){listeners.add(callback);load().then(()=>callback(snapshot())).catch(onError||console.error);},async set(data){return commit({action:'admin',data});},async transaction(fn){await load();const next=fn(structuredClone(cached.data));if(!next)return {committed:false,snapshot:snapshot()};let input;
    if(boot.user?.role==='admin')input={action:'admin',data:next};else{const before=cached.data.registration.entries,after=next.registration.entries,added=after.filter(e=>!before.some(b=>b.id===e.id)),removed=before.filter(e=>!after.some(b=>b.id===e.id));if(added.length===1&&!removed.length)input={action:'join',division:added[0].division};else if(removed.length===1&&!added.length)input={action:'remove',id:removed[0].id};else throw new Error('Unauthorized tournament change');}
    const result=await commit(input);return {committed:true,snapshot:result};}};}
  window.firebase={apps:[{}],initializeApp(){},database:()=>({ref})};setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))load().then(notify).catch(console.error);},15000);return boot;
})();
