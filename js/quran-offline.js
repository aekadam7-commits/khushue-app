/* ============================================================
   خُشوع — quran-offline.js
   نص القرآن والبحث والمصحف دون إنترنت
   البيانات تُولَّد وقت البناء في www/data (scripts/prepare-offline.js)
   ============================================================ */

const QuranOffline = {
  _data: null,      // [سورة][آية] = [النص العثماني, رقم الصفحة]
  _simple: null,    // [سورة][آية] = نص إملائي للبحث
  _loading: {},
  _pages: null,
  _normList: null,
  MARKS: /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/,

  _load(src, globalName){
    return new Promise(resolve => {
      if(window[globalName]) return resolve(window[globalName]);
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve(window[globalName] || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  },

  async ensure(){
    if(this._data) return true;
    if(!this._loading.main) this._loading.main = this._load('data/quran-data.js', 'QURAN_OFFLINE');
    const d = await this._loading.main;
    if(d && d.length === 114){ this._data = d; return true; }
    this._loading.main = null;
    return false;
  },

  async ensureSimple(){
    if(this._simple) return true;
    if(!this._loading.simple) this._loading.simple = this._load('data/quran-search.js', 'QURAN_SIMPLE');
    const d = await this._loading.simple;
    if(d && d.length === 114){ this._simple = d; return true; }
    this._loading.simple = null;
    return false;
  },

  // ============ السور والصفحات ============
  surahAyahs(n){
    const s = this._data && this._data[n - 1];
    if(!s) return null;
    return s.map((a, i) => ({ text:a[0], page:a[1], numberInSurah:i + 1 }));
  },

  surahFirstPage(n){
    const s = this._data && this._data[n - 1];
    return s && s[0] ? s[0][1] : null;
  },

  pageAyahs(p){
    if(!this._data) return null;
    if(!this._pages){
      const pages = {};
      this._data.forEach((s, si) => {
        s.forEach((a, i) => {
          if(!pages[a[1]]) pages[a[1]] = [];
          pages[a[1]].push({
            text: a[0],
            numberInSurah: i + 1,
            surah: { number: si + 1, name: 'سورة ' + SURAHS[si][1] }
          });
        });
      });
      this._pages = pages;
    }
    return this._pages[p] || null;
  },

  // ============ تطبيع النص العربي ============
  normChar(c){
    if(this.MARKS.test(c)) return '';
    if(c === 'ٱ' || c === 'أ' || c === 'إ' || c === 'آ') return 'ا';
    if(c === 'ى') return 'ي';
    if(c === 'ة') return 'ه';
    return c;
  },

  norm(s){
    let o = '';
    for(let i = 0; i < s.length; i++) o += this.normChar(s[i]);
    return o;
  },

  highlight(text, words){
    let n = '';
    const map = [];
    for(let i = 0; i < text.length; i++){
      const c = this.normChar(text[i]);
      if(c){ n += c; map.push(i); }
    }

    let ranges = [];
    words.forEach(w => {
      if(!w) return;
      let p = 0;
      while((p = n.indexOf(w, p)) >= 0){
        ranges.push([map[p], map[p + w.length - 1] + 1]);
        p += w.length;
      }
    });
    ranges.sort((a, b) => a[0] - b[0]);

    const merged = [];
    ranges.forEach(r => {
      const last = merged[merged.length - 1];
      if(last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });

    let out = '';
    let pos = 0;
    merged.forEach(r => {
      let end = r[1];
      while(end < text.length && this.normChar(text[end]) === '') end++;
      out += text.slice(pos, r[0]) +
        '<mark style="background:rgba(201,169,97,.3);color:inherit;border-radius:4px;padding:0 3px">' +
        text.slice(r[0], end) + '</mark>';
      pos = end;
    });
    return out + text.slice(pos);
  },

  // ============ البحث ============
  async search(query){
    if(!(await this.ensure())) return null;
    await this.ensureSimple();

    const words = this.norm(query.trim()).split(/\s+/).filter(Boolean);
    if(!words.length) return { count:0, results:[] };

    const source = this._simple || this._data.map(s => s.map(a => a[0]));

    if(!this._normList || this._normSource !== source){
      this._normList = source.map(s => s.map(t => this.norm(t)));
      this._normSource = source;
    }

    const results = [];
    let count = 0;
    for(let si = 0; si < source.length; si++){
      const arr = this._normList[si];
      for(let ai = 0; ai < arr.length; ai++){
        const t = arr[ai];
        let ok = true;
        for(let w = 0; w < words.length; w++){
          if(t.indexOf(words[w]) < 0){ ok = false; break; }
        }
        if(!ok) continue;
        count++;
        if(results.length < 200){
          const plain = source[si][ai];
          results.push({
            text: plain,
            html: this.highlight(plain, words),
            surah: { number: si + 1, name: 'سورة ' + SURAHS[si][1] },
            numberInSurah: ai + 1
          });
        }
      }
    }
    return { count, results };
  }
};
