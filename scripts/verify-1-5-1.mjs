import fs from 'node:fs';
import path from 'node:path';
const R='/home/tanmay/praman';
const fail=(m)=>{console.error('FAIL: '+m);process.exit(1);};
const has=(p)=>fs.existsSync(path.join(R,p))||fail('missing '+p);
const txt=(p)=>fs.readFileSync(path.join(R,p),'utf8');
const need=(p,s)=>txt(p).includes(s)||fail(p+' lacks '+s);
has('api/workflow/index.js');need('api/workflow/index.js','escalat');need('api/workflow/index.js','SLA');console.log('workflow verification passed');
