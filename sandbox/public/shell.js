(async function(){
  let user=null;try{user=(await(await fetch('/api/bootstrap')).json()).user;}catch(_){}
  function mount(){
    const english=window.DoveLanguage?.getLanguage()==='en';
    let banner=document.querySelector('.staging-banner');if(!banner){banner=document.createElement('div');banner.className='staging-banner';document.body.prepend(banner);}
    banner.textContent=english?'TEST ENVIRONMENT · SEPARATE DATABASE · NO LIVE REGISTRATION CHANGES':'测试环境 · 独立数据库 · 不影响正式报名';
    const login=document.querySelector('.dove-site-register');if(login){login.href='/account.html?lang='+(english?'en':'zh');login.textContent=user?(english?'My Account':'我的账户'):(english?'Sign In / Register':'登录 / 注册');}
    const links=document.querySelector('.dove-site-links');if(links){let a=links.querySelector('[data-staging-signup]');if(!a){a=document.createElement('a');a.className='dove-site-link';a.dataset.stagingSignup='';links.append(a);}a.href='/signup.html?lang='+(english?'en':'zh');a.textContent=english?'Register':'报名';}
    if(links)for(const [key,page,zh,en] of [['courts','courts.html','场地','Courts'],['scores','scores.html','到场记录','Attendance'],...(user?.role==='admin'?[['admin','finance.html','管理中心','Admin']]:[])]){let a=links.querySelector(`[data-staging-route="${key}"]`);if(!a){a=document.createElement('a');a.className='dove-site-link';a.dataset.stagingRoute=key;links.append(a);}a.href='/'+page+'?lang='+(english?'en':'zh');a.textContent=english?en:zh;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.addEventListener('dove:languagechange',()=>requestAnimationFrame(mount));
}());
