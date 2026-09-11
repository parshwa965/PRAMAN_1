import fs from 'node:fs';
import path from 'node:path';
const R='/home/tanmay/praman';
const fail=(m)=>{console.error('FAIL: '+m);process.exit(1);};
const has=(p)=>fs.existsSync(path.join(R,p))||fail('missing '+p);
const txt=(p)=>fs.readFileSync(path.join(R,p),'utf8');
const need=(p,s)=>txt(p).includes(s)||fail(p+' lacks '+s);
has('api/db/schema.sql');const s=txt('api/db/schema.sql');for(const t of ['beneficiary','facility','grant','inspection','evidence','assignment','vc_log','audit_log'])if(!s.includes(t))fail('schema lacks '+t);for(const sc of ['PM-DAKSH','SHRESHTA'])if(!s.includes(sc)&&!txt('api/db/schema.sql').includes('scheme'))fail('scheme missing');console.log('schema verification passed');
