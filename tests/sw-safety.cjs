const fs=require('node:fs');const assert=require('node:assert/strict');const vm=require('node:vm');
const src=fs.readFileSync('sw.js','utf8');
new vm.Script(src,{filename:'sw.js'});
assert.match(src,/const CACHE='baba-v\d+'/);
assert.match(src,/if\(!sameOrigin\(url\)\)return/);
assert.match(src,/if\(navigation\)/);
assert.match(src,/return Response\.error\(\)/);
assert.doesNotMatch(src,/caches\.match\('index\.html'\)\)\)/);
console.log('PWA service worker syntax and offline fallback smoke checks passed');
