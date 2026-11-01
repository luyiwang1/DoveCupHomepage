window.DoveSandboxReady=(async()=>{
  const boot=await(await fetch('/api/bootstrap')).json();window.DoveSandboxUser=boot.user;
  const id='2026-08-08-mixed-team',listeners=new Set();let cached=null;
  const load=async()=>{cached=await(await fetch('/api/team')).json();return cached;};
  const root=data=>({teamEvents:{[id]:data},scores:{players:{},events:[]}});
  const parts=path=>path.split('/').filter(Boolean).slice(1);
  const read=(data,path)=>parts(path).reduce((value,key)=>value?.[key],root(data));
  function replace(data,path,value){const full=root(data),keys=parts(path);if(!keys.length)return value.teamEvents?.[id];let target=full;for(const k of keys.slice(0,-1))target=target[k]??={};target[keys.at(-1)]=value;return full.teamEvents[id];}
  async function write(path,value){const before=cached||await load(),data=replace(before.data,path,value);const response=await fetch('/api/team',{method:'PUT',headers:{'Content-Type':'application/json','X-CSRF-Token':boot.csrf},body:JSON.stringify({data,revision:before.revision})});const result=await response.json();if(!response.ok)throw new Error(result.error);cached=result;notify();return {val:()=>read(result.data,path)};}
  function notify(){for(const l of listeners)l.callback({val:()=>read(cached.data,l.path)});}
  function ref(path){return {child:key=>ref(path+'/'+key),on(_event,callback,onError){listeners.add({path,callback});load().then(()=>callback({val:()=>read(cached.data,path)})).catch(onError||console.error);},set:value=>write(path,value),async update(value){const state=cached||await load();return write(path,{...read(state.data,path),...value});},async transaction(fn,callback){try{await load();const next=fn(structuredClone(read(cached.data,path)));if(next===undefined){callback?.(null,false);return {committed:false,snapshot:{val:()=>read(cached.data,path)}};}const snapshot=await write(path,next);callback?.(null,true,snapshot);return {committed:true,snapshot};}catch(error){callback?.(error,false);if(!callback)throw error;return {committed:false};}}};}
  window.firebase={apps:[{}],initializeApp(){},database:()=>({ref})};
  setInterval(()=>{if(!document.hidden)load().then(notify).catch(console.error);},15000);return boot;
})();
