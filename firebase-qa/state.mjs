// QA compatibility adapter: cloud state is authoritative; SQLite is request-local only.
export const TABLES = ['members','events','bookings','payments','packages','grants','attendance','ledger','legacy','claims','audit','sessions','operation_documents','signup_confirmations','special_attendance'];
const MAX_BYTES = 8 * 1024 * 1024;

export function dumpState(domain, {sessions=true}={}) {
  const tables = Object.fromEntries(TABLES.map(table => [table, table==='sessions'&&!sessions ? [] : domain.all(`SELECT rowid AS __rowid,* FROM ${table} ORDER BY rowid`)]));
  const payload=JSON.stringify(tables);
  if(Buffer.byteLength(payload)>MAX_BYTES)throw Error('QA state limit reached; export and migrate before increasing capacity');
  return {schema:1,payload};
}

export function restoreState(domain,state) {
  if(state?.schema!==1||typeof state.payload!=='string'||Buffer.byteLength(state.payload)>MAX_BYTES)throw Error('Invalid QA state');
  const tables=JSON.parse(state.payload);
  if(Object.keys(tables).length!==TABLES.length||TABLES.some(table=>!Array.isArray(tables[table])))throw Error('Invalid QA tables');
  domain.db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE');
  try {
    for(const table of [...TABLES].reverse())domain.run(`DELETE FROM ${table}`);
    for(const table of TABLES){
      const columns=domain.all(`PRAGMA table_info(${table})`).map(c=>c.name);
      const insert=domain.db.prepare(`INSERT INTO ${table}(rowid,${columns.join(',')}) VALUES(${columns.map(()=>'?').concat('?').join(',')})`);
      for(const row of tables[table]){
        if(!row||Object.keys(row).some(key=>key!=='__rowid'&&!columns.includes(key))||!Number.isSafeInteger(row.__rowid))throw Error('Invalid QA row');
        insert.run(row.__rowid,...columns.map(c=>row[c]??null));
      }
    }
    if(domain.all('PRAGMA foreign_key_check').length)throw Error('QA state has broken references');
    domain.db.exec('COMMIT');
  }catch(error){domain.db.exec('ROLLBACK');throw error;}
  finally{domain.db.exec('PRAGMA foreign_keys=ON');}
}

export function firebaseStore(database) {
  const ref=database.ref('memberSystemQA/state');
  return {
    async read(){return (await ref.get()).val();},
    async initialize(state){
      const result=await ref.transaction(current=>current===null?{...state,revision:1,updatedAt:Date.now()}:undefined,undefined,false);
      return result.committed;
    },
    async commit(revision,state){
      // Keep a listener through the transaction so an empty SDK cache is not
      // mistaken for a missing cloud state on a cold function instance.
      const listener=()=>{};
      ref.on('value',listener);
      try{
        await ref.once('value');
        const result=await ref.transaction(current=>{
          if(!current||current.revision!==revision)return;
          return {...state,revision:revision+1,updatedAt:Date.now()};
        },undefined,false);
        return result.committed;
      }finally{ref.off('value',listener);}
    },
    async allowAttempt(key,now,limit=20){
      const bucket=Math.floor(now/900000),rate=database.ref(`memberSystemQA/authLimits/${bucket}/${key}`);
      const result=await rate.transaction(value=>(Number(value)||0)>=limit?undefined:(Number(value)||0)+1,undefined,false);
      return result.committed;
    }
  };
}
