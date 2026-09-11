import fs from 'node:fs';
import path from 'node:path';
const R='/home/tanmay/praman';
const fail=(m)=>{console.error('FAIL: '+m);process.exit(1);};
const has=(p)=>fs.existsSync(path.join(R,p))||fail('missing '+p);
const txt=(p)=>fs.readFileSync(path.join(R,p),'utf8');
const need=(p,s)=>txt(p).includes(s)||fail(p+' lacks '+s);
const bad=["// ...","// rest","// TODO","rest follows same pattern","for brevity"];for(const f of ['package.json','README.md']){if(!fs.existsSync(R+'/'+f))fail('missing '+f);const t=txt(f);for(const b of bad)if(t.includes(b))fail(f+' has placeholder '+b);}console.log('clean verification passed');
