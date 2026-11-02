import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const views=source.slice(source.indexOf('function profileDate('),source.indexOf('function packageCard('));
function context(attended=0){
  const profile={attended,received:35000,bookings:[{id:'b1',event_id:'e1',date:'2026-11-07',venue_id:'nyta-east',level:'25_30',status:'joined'},{id:'b2',event_id:'e2',date:'2026-11-14',venue_id:'mrtc',level:'25_30',status:'cancelled'}],attendance:[],payments:[],packages:[{id:'p1',ownerName:'Alex',remaining:8,isOwner:true}],claims:[]};
  const state={user:{id:'member-unique-001',username:'alex',displayName:'Alex',role:'member'},profile,events:[{id:'e1',status:'open'},{id:'e2',status:'open'}],tab:'overview',legacy:[]};
  const ctx=vm.createContext({state,language:'en',Intl,Date,t:(_zh,en)=>en,esc:value=>String(value??''),money:cents=>'$'+(cents/100).toFixed(2),levelName:level=>level,venueName:key=>key==='mrtc'?'MRTC':'NYTA East Bubble',badge:value=>`<span>${value}</span>`,action:(kind,id,label)=>`<button data-action="${kind}" data-id="${id}">${label}</button>`,table:()=>'<table></table>',packageCard:()=>'<div>Package</div>',paymentsTable:()=>'<table></table>'});
  vm.runInContext(views,ctx);return {ctx,state};
}
test('member overview shows real stats and links, without direct signup or invented match records',()=>{
  const {ctx}=context();const html=vm.runInContext('accountView()',ctx);
  assert.match(html,/player-hero/);assert.match(html,/Alex/);assert.match(html,/Confirmed Visits/);assert.match(html,/\$350\.00/);
  assert.match(html,/NYTA East Bubble/);assert.ok(!html.includes('profile-session-date"><strong>14'));
  assert.ok(!html.includes('id="bookingForm"'));assert.ok(!/Win Rate|ATP Rank|Prize Money/.test(html));
  assert.equal((html.match(/class="earned"/g)||[]).length,0);
});
test('attendance milestones only unlock for confirmed visit counts and keep the next target ahead',()=>{
  const {ctx}=context(12);const html=vm.runInContext('profileOverview(state.profile)',ctx);
  assert.equal((html.match(/class="earned"/g)||[]).length,2);assert.match(html,/<progress max="25" value="12"/);
});
test('administrator workspace link stays in personal account settings',()=>{
  const {ctx,state}=context();state.user.role='admin';state.tab='settings';const html=vm.runInContext('accountView()',ctx);
  assert.match(html,/Administrator Access/);assert.match(html,/href="\/finance\.html\?lang=en"/);assert.match(html,/id="profileForm"/);assert.match(html,/id="passwordForm"/);
});
