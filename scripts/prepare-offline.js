/* ============================================================
   خُشوع — scripts/prepare-offline.js
   يجهّز مجلد www بكل ما يلزم للعمل دون إنترنت:
   - نسخ index.html و css و js و sounds
   - مكتبة adhan، ومكتبة QR، والخطوط (من node_modules)
   - نص القرآن الكامل مع أرقام الصفحات (يُجلب مرة واحدة وقت البناء)
   التشغيل:  npm install && node scripts/prepare-offline.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');
const NM = path.join(ROOT, 'node_modules');

// ---------- أدوات النص (مُصدَّرة للاختبار) ----------
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/g;

function plain(s){
  return s.replace(MARKS, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي');
}

function stripBasmala(text){
  const clean = text.replace(/^\uFEFF/, '').trim();
  const toks = clean.split(/\s+/);
  if(toks.length > 4 && plain(toks.slice(0, 4).join(' ')) === 'بسم الله الرحمن الرحيم'){
    return toks.slice(4).join(' ');
  }
  return clean;
}

// يحوّل نتيجة alquran.cloud إلى مصفوفات مضغوطة، ويتحقق من سلامتها
function buildData(surahs, withPage){
  if(!Array.isArray(surahs) || surahs.length !== 114){
    throw new Error('عدد السور غير صحيح: ' + (surahs && surahs.length));
  }
  let total = 0;
  const out = surahs.map((s, si) => {
    const n = si + 1;
    return s.ayahs.map((a, ai) => {
      total++;
      let t = (n !== 1 && n !== 9 && ai === 0) ? stripBasmala(a.text) : a.text.replace(/^\uFEFF/, '').trim();
      if(!withPage) return t;
      if(!(a.page >= 1 && a.page <= 604)){
        throw new Error('رقم صفحة غير صالح في سورة ' + n + ' آية ' + (ai + 1));
      }
      return [t, a.page];
    });
  });
  if(total !== 6236) throw new Error('عدد الآيات ' + total + ' بدل 6236');
  return out;
}

// ---------- أدوات الملفات ----------
function mkdir(p){ fs.mkdirSync(p, { recursive:true }); }

function copyFile(src, dst, required){
  if(!fs.existsSync(src)){
    const msg = 'غير موجود: ' + path.relative(ROOT, src);
    if(required) throw new Error(msg);
    console.warn('⚠️  ' + msg);
    return false;
  }
  mkdir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log('✅ ' + path.relative(ROOT, dst));
  return true;
}

function copyDir(src, dst){
  if(!fs.existsSync(src)) return;
  fs.cpSync(src, dst, { recursive:true });
  console.log('✅ ' + path.relative(ROOT, dst) + '/');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const API = 'https://api.alquran.cloud/v1';
const QCOM = 'https://api.quran.com/api/v4';
const CACHE_DIR = path.join(ROOT, '.cache');

async function getJSON(url, attempts){
  for(let i = 1; i <= attempts; i++){
    try{
      const r = await fetch(url);
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch(e){
      console.warn('⚠️  ' + url.replace(API, '').replace(QCOM, '') + ' محاولة ' + i + ': ' + e.message);
      if(i < attempts) await sleep(3000 * i);
    }
  }
  return null;
}

// المصدر الأول: api.alquran.cloud (يفشل سريعاً إن كان الخادم يرفض الطلبات)
async function fromAlquranCloud(edition){
  const whole = await getJSON(API + '/quran/' + edition, 2);
  if(whole && whole.data && whole.data.surahs && whole.data.surahs.length === 114){
    return whole.data.surahs;
  }

  const probe = await getJSON(API + '/surah/1/' + edition, 2);
  if(!probe || !probe.data || !probe.data.ayahs){
    console.warn('⚠️  المصدر alquran.cloud لا يستجيب — الانتقال إلى المصدر البديل');
    return null;
  }

  const list = [{ ayahs: probe.data.ayahs }];
  for(let n = 2; n <= 114; n++){
    const j = await getJSON(API + '/surah/' + n + '/' + edition, 4);
    if(!j || !j.data || !j.data.ayahs) return null;
    list.push({ ayahs: j.data.ayahs });
    await sleep(250);
  }
  return list;
}

// المصدر الثاني: api.quran.com — صفحة صفحة، فيُعرف رقم الصفحة من الطلب نفسه
async function fromQuranCom(kind, field){
  const surahs = Array.from({ length:114 }, () => ({ ayahs:[] }));
  const pages = Array.from({ length:604 }, (_, i) => i + 1);
  const BATCH = 6;

  for(let i = 0; i < pages.length; i += BATCH){
    const batch = pages.slice(i, i + BATCH);
    const ok = await Promise.all(batch.map(async p => {
      const j = await getJSON(QCOM + '/quran/verses/' + kind + '?page_number=' + p, 4);
      if(!j || !Array.isArray(j.verses)) return false;
      for(const v of j.verses){
        const parts = String(v.verse_key || '').split(':').map(Number);
        const sn = parts[0], an = parts[1];
        if(!(sn >= 1 && sn <= 114) || !(an >= 1) || typeof v[field] !== 'string') return false;
        surahs[sn - 1].ayahs[an - 1] = { text: v[field], page: p };
      }
      return true;
    }));
    if(ok.some(x => !x)){
      console.warn('⚠️  فشل جلب بعض الصفحات من api.quran.com');
      return null;
    }
    if((i / BATCH) % 20 === 0) console.log('   ... صفحة ' + Math.min(i + BATCH, 604) + ' / 604');
    await sleep(150);
  }

  // لا يجوز وجود ثغرات في الآيات
  for(const s of surahs){
    for(let k = 0; k < s.ayahs.length; k++){
      if(!s.ayahs[k]) return null;
    }
  }
  return surahs;
}

const QCOM_KINDS = {
  'quran-uthmani': ['uthmani', 'text_uthmani'],
  'quran-simple':  ['imlaei', 'text_imlaei']
};

// الترتيب: ذاكرة مؤقتة ← alquran.cloud ← api.quran.com
async function fetchEdition(edition){
  const cacheFile = path.join(CACHE_DIR, edition + '.json');
  try{
    if(fs.existsSync(cacheFile)){
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if(Array.isArray(cached) && cached.length === 114){
        console.log('♻️  ' + edition + ' من الذاكرة المؤقتة');
        return cached;
      }
    }
  } catch(e){}

  let surahs = await fromAlquranCloud(edition);

  if(!surahs && QCOM_KINDS[edition]){
    console.log('🔁 جلب ' + edition + ' من api.quran.com ...');
    surahs = await fromQuranCom(QCOM_KINDS[edition][0], QCOM_KINDS[edition][1]);
  }
  if(!surahs) return null;

  try{
    buildData(surahs, edition === 'quran-uthmani'); // تحقق قبل الحفظ في الذاكرة
    mkdir(CACHE_DIR);
    fs.writeFileSync(cacheFile, JSON.stringify(surahs.map(s => ({ ayahs: s.ayahs.map(a => ({ text:a.text, page:a.page })) }))));
  } catch(e){
    console.warn('⚠️  البيانات غير صالحة: ' + e.message);
    return null;
  }
  return surahs;
}

// ---------- الخطوط ----------
const FONTS = [
  { pkg:'cairo',       name:'Cairo',       weights:[400, 600, 700] },
  { pkg:'reem-kufi',   name:'Reem Kufi',   weights:[400, 600, 700] },
  { pkg:'amiri-quran', name:'Amiri Quran', weights:[400] }
];

const RANGES = {
  arabic: 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC',
  latin:  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
};

function prepareFonts(){
  let css = '/* مُولَّد تلقائياً — scripts/prepare-offline.js */\n';
  let count = 0;
  FONTS.forEach(f => {
    ['arabic', 'latin'].forEach(subset => {
      f.weights.forEach(w => {
        const file = f.pkg + '-' + subset + '-' + w + '-normal.woff2';
        const src = path.join(NM, '@fontsource', f.pkg, 'files', file);
        if(!copyFile(src, path.join(WWW, 'fonts', file), false)) return;
        css += '@font-face{font-family:"' + f.name + '";font-style:normal;font-weight:' + w +
               ';font-display:swap;src:url(../fonts/' + file + ') format("woff2");unicode-range:' +
               RANGES[subset] + ';}\n';
        count++;
      });
    });
  });
  mkdir(path.join(WWW, 'css'));
  fs.writeFileSync(path.join(WWW, 'css', 'fonts.css'), css);
  console.log('✅ css/fonts.css (' + count + ' خط)');
}


// ---------- محتوى المكتبة الإسلامية دون إنترنت ----------
function prepareIslamicContent(){
  const source = path.join(ROOT, 'content', 'islamic-library.json');
  if(!fs.existsSync(source)) throw new Error('ملف محتوى المكتبة غير موجود: content/islamic-library.json');
  const data = JSON.parse(fs.readFileSync(source, 'utf8'));
  for(const key of ['seerah','prophets','hisn','events']){
    if(!Array.isArray(data[key]) || data[key].length === 0) throw new Error('قسم فارغ أو غير صالح في المحتوى: ' + key);
    for(let i=0;i<data[key].length;i++){
      const item=data[key][i];
      if(!item || typeof item.title !== 'string' || !item.title.trim() || typeof item.text !== 'string' || !item.text.trim()){
        throw new Error('عنوان أو نص ناقص في ' + key + ' عند العنصر ' + (i+1));
      }
      if(item.date && !/^\d{2}-\d{2}$/.test(item.date)) throw new Error('تاريخ غير صالح في الحدث: ' + item.title);
    }
  }
  mkdir(path.join(WWW, 'data'));
  const target = path.join(WWW, 'data', 'islamic-library.js');
  fs.writeFileSync(target, '/* محتوى محلي مُولّد وقت البناء؛ لا يحتاج إلى اتصال بعد التثبيت */\nwindow.ISLAMIC_CONTENT=' + JSON.stringify(data) + ';', 'utf8');
  console.log('✅ data/islamic-library.js (' + data.seerah.length + ' سيرة، ' + data.prophets.length + ' قصة، ' + data.hisn.length + ' ذكر، ' + data.events.length + ' حدث)');
}

// ---------- التشغيل ----------
async function main(){
  // 1) ملفات التطبيق
  fs.rmSync(WWW, { recursive:true, force:true });
  mkdir(WWW);
  copyFile(path.join(ROOT, 'index.html'), path.join(WWW, 'index.html'), true);
  copyDir(path.join(ROOT, 'css'), path.join(WWW, 'css'));
  copyDir(path.join(ROOT, 'js'), path.join(WWW, 'js'));
  copyDir(path.join(ROOT, 'sounds'), path.join(WWW, 'sounds'));

  // 2) المكتبات
  copyFile(path.join(NM, 'adhan', 'lib', 'bundles', 'adhan.umd.min.js'),
           path.join(WWW, 'vendor', 'adhan.umd.min.js'), true);
  copyFile(path.join(NM, 'qrcode-generator', 'qrcode.js'),
           path.join(WWW, 'vendor', 'qrcode.js'), false);

  // 3) الخطوط
  prepareFonts();

  // 4) تجهيز الموسوعة المحلية قبل محاولة جلب القرآن
  prepareIslamicContent();

  // 5) نص القرآن
  console.log('⏬ جلب نص القرآن (العثماني)...');
  const uth = await fetchEdition('quran-uthmani');
  if(!uth){
    if(process.env.REQUIRE_QURAN === '1'){
      throw new Error('تعذر جلب نص القرآن من أي مصدر');
    }
    console.warn('⚠️  تعذر جلب نص القرآن من كل المصادر. سيُبنى التطبيق بدونه، وسيحتاج القرآن إلى إنترنت. أعد تشغيل البناء لاحقاً.');
    console.log('🎉 اكتمل تجهيز www (بدون نص القرآن المحلي)');
    return;
  }
  const main = buildData(uth, true);
  mkdir(path.join(WWW, 'data'));
  fs.writeFileSync(path.join(WWW, 'data', 'quran-data.js'),
                   'window.QURAN_OFFLINE=' + JSON.stringify(main) + ';');
  console.log('✅ data/quran-data.js');

  console.log('⏬ جلب النص الإملائي للبحث...');
  const simple = await fetchEdition('quran-simple');
  if(simple){
    try{
      const s = buildData(simple, false);
      fs.writeFileSync(path.join(WWW, 'data', 'quran-search.js'),
                       'window.QURAN_SIMPLE=' + JSON.stringify(s) + ';');
      console.log('✅ data/quran-search.js');
    } catch(e){
      console.warn('⚠️  تخطي ملف البحث الإملائي: ' + e.message + ' (سيُستعمل النص العثماني)');
    }
  } else {
    console.warn('⚠️  تخطي ملف البحث الإملائي (سيُستعمل النص العثماني)');
  }

  console.log('🎉 اكتمل تجهيز www');
}

module.exports = { plain, stripBasmala, buildData, prepareIslamicContent };

if(require.main === module){
  main().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
}
