import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
if(!args.includes('--confirm')||!args.includes('--username')||!args.includes('--display-name'))throw new Error('Provide --username, --display-name and --confirm');
const db=new DatabaseSync(resolve(here,'../.data/members.sqlite'));
db.exec('PRAGMA busy_timeout=5000');
const owner=db.prepare('SELECT id,username,display_name,role FROM members WHERE username=?').get(value('--username'));
if(!owner||owner.display_name!==value('--display-name'))throw new Error('Account identity does not match; no changes made');
db.exec('BEGIN IMMEDIATE');
try{
  const before=db.prepare('SELECT id,username,display_name,role,auth_version FROM members').all();
  const backup=resolve(here,'../.data/role-backups');mkdirSync(backup,{recursive:true});
  writeFileSync(resolve(backup,`before-owner-admin-${Date.now()}.json`),JSON.stringify({at:new Date().toISOString(),members:before},null,2));
  for(const member of before.filter(m=>m.role==='admin'&&m.id!==owner.id)){
    db.prepare("UPDATE members SET role='member',auth_version=auth_version+1 WHERE id=?").run(member.id);
    for(const session of db.prepare('SELECT id,value FROM sessions').all())if(JSON.parse(session.value).userId===member.id)db.prepare('DELETE FROM sessions WHERE id=?').run(session.id);
    db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),owner.id,'admin.role_revoked',member.id,'{}',new Date().toISOString());
  }
  db.prepare("UPDATE members SET role='admin' WHERE id=?").run(owner.id);
  db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(randomUUID(),owner.id,'admin.owner_granted',owner.id,JSON.stringify({method:'explicit-local-owner-authorization'}),new Date().toISOString());
  db.exec('COMMIT');
  console.log(JSON.stringify({account:owner.username,displayName:owner.display_name,role:'admin',adminCount:db.prepare("SELECT COUNT(*) n FROM members WHERE role='admin'").get().n,passwordUnchanged:true}));
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
