import fs from 'node:fs';
import path from 'node:path';
const R='/home/tanmay/praman';
const fail=(m)=>{console.error('FAIL: '+m);process.exit(1);};
const has=(p)=>fs.existsSync(path.join(R,p))||fail('missing '+p);
const txt=(p)=>fs.readFileSync(path.join(R,p),'utf8');
const need=(p,s)=>txt(p).includes(s)||fail(p+' lacks '+s);
has('mobile/pubspec.yaml');has('mobile/lib/auth/auth_provider.dart');has('mobile/lib/auth/offline_queue.dart');need('mobile/pubspec.yaml','provider');need('mobile/lib/auth/auth_provider.dart','dispose');console.log('mobile-auth verification passed');
