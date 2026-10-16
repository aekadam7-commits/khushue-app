/* ============================================================
   خُشوع — scripts/check-reciters.js
   يفحص روابط القرّاء (معلوماتي فقط، لا يوقف البناء):
   - الاستماع:  <server>001.mp3     (mp3quran.net)
   - القراءة:   <folder>/001001.mp3 (everyayah.com)
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
const { RECITERS, LISTEN_RECITERS } = vm.runInNewContext(src + ';({RECITERS,LISTEN_RECITERS})');

async function reachable(url){
  for(const method of ['HEAD', 'GET']){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(url, {
        method,
        headers: method === 'GET' ? { Range: 'bytes=0-0' } : {},
        signal: ctrl.signal
      });
      clearTimeout(t);
      if(r.ok || r.status === 206) return { ok:true, status:r.status };
      if(method === 'GET') return { ok:false, status:r.status };
    } catch(e){
      if(method === 'GET') return { ok:false, status:e.name === 'AbortError' ? 'timeout' : 'error' };
    }
  }
  return { ok:false, status:'?' };
}

async function main(){
  const jobs = [];
  LISTEN_RECITERS.forEach(r => jobs.push({ kind:'استماع', id:r.id, name:r.name, url:r.server + '001.mp3' }));
  RECITERS.forEach(r => jobs.push({
    kind:'قراءة', id:r.id, name:r.name,
    url:'https://everyayah.com/data/' + r.folder + '/001001.mp3'
  }));

  const results = [];
  let i = 0;
  const worker = async () => {
    while(i < jobs.length){
      const job = jobs[i++];
      const res = await reachable(job.url);
      results.push({ ...job, ...res });
    }
  };
  await Promise.all(Array.from({ length:6 }, worker));

  results.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  results.forEach(r => {
    console.log((r.ok ? '✅' : '❌') + ' [' + r.kind + '] ' + r.id + ' — ' + r.name + (r.ok ? '' : '  (' + r.status + ')  ' + r.url));
  });

  const bad = results.filter(r => !r.ok);
  console.log('\nالنتيجة: ' + (results.length - bad.length) + ' يعمل، ' + bad.length + ' لا يستجيب');
  if(bad.length === results.length){
    console.log('⚠️  كل الروابط فشلت: غالباً الخادم يحجب سيرفرات GitHub، وليست الروابط بالضرورة خاطئة.');
  }
}

main().catch(e => { console.error('تعذر الفحص: ' + e.message); });
