import fs from 'node:fs';
import path from 'node:path';
const R='/home/tanmay/praman';
const fail=(m)=>{console.error('FAIL: '+m);process.exit(1);};
const has=(p)=>fs.existsSync(path.join(R,p))||fail('missing '+p);
const txt=(p)=>fs.readFileSync(path.join(R,p),'utf8');
const need=(p,s)=>txt(p).includes(s)||fail(p+' lacks '+s);
has('api/db/migrate.js');need('api/db/migrate.js','migrate');console.log('migrate verification passed');
