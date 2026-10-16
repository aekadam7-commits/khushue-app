/* ============================================================
   خُشوع — quran.js
   القرآن للحفظ + القرآن للاستماع
   ============================================================ */

const Quran = {
  currentSurah: null,
  currentAyah: 0,
  ayahs: [],
  playing: false,
  repeat: 0,
  repeatCount: 0,
  reciter: 'saad',
  audio: null,
  
  init(){
    this.audio = document.getElementById('ayahAudio');
    this.audio.addEventListener('ended', () => this.playNext());
    
    this.reciter = Store.get('reciter', 'saad');
    if(!RECITERS.some(x => x.id === this.reciter)) this.reciter = 'saad';
    this.repeat = parseInt(Store.get('repeat', '0'), 10);
    
    this.updateReciterDisplay();
    this.renderRepeatBtn();
    window.addEventListener('popstate', () => {
      if(this._silentPop){ this._silentPop = false; return; }
      if(document.body.classList.contains('quran-fs')){ this._fsHist = false; this.backToList(); }
    });
    this.renderList();
    this.renderSetReciterLabel();
    this.renderSetRepeatLabel();
  },
  
  renderRepeatBtn(){
    const labels = { 0:'لا تكرار', 1:'×1', 2:'×2', 5:'×5' };
    const btn = document.getElementById('repeatBtn');
    if(btn) btn.textContent = '🔁 ' + (labels[this.repeat] || 'لا تكرار');
  },

  enterFullscreen(){
    document.body.classList.add('quran-fs');
    if(!this._fsHist){ try{ history.pushState({ quranFs:1 }, ''); this._fsHist = true; }catch(e){} }
  },

  exitFullscreen(){
    document.body.classList.remove('quran-fs');
    if(this._fsHist){
      this._fsHist = false;
      this._silentPop = true;
      try{ history.back(); }catch(e){ this._silentPop = false; }
    }
  },

  changeFont(delta){
    let f = parseInt(Store.get('quranFont', 28), 10) || 28;
    f = Math.max(20, Math.min(48, f + delta));
    Store.set('quranFont', f);
    document.documentElement.style.setProperty('--quran-fs', f + 'px');
    const sf = document.getElementById('setQuranFont');
    if(sf) sf.value = f;
  },

  renderSetReciterLabel(){
    const r = RECITERS.find(x => x.id === this.reciter);
    const lbl = document.getElementById('setReciterLabel');
    if(lbl) lbl.textContent = r ? r.name : '—';
  },
  
  renderSetRepeatLabel(){
    const map = { 0:'بدون تكرار', 1:'مرة إضافية', 2:'مرتان', 5:'5 مرات (للحفظ)' };
    const lbl = document.getElementById('setRepeatLabel');
    if(lbl) lbl.textContent = map[this.repeat] || 'بدون تكرار';
  },
  
  updateReciterDisplay(){
    const r = RECITERS.find(x => x.id === this.reciter);
    const el = document.getElementById('currentReciter');
    if(el) el.textContent = r ? r.name : '—';
  },
  
  setReciter(id){
    this.reciter = id;
    Store.set('reciter', id);
    this.updateReciterDisplay();
    this.renderSetReciterLabel();
    toast('القارئ: ' + RECITERS.find(x => x.id === id).name);
  },
  
  openReciterPicker(){
    const options = RECITERS.map(r => ({
      value: r.id,
      label: (r.id === 'saad' ? '⭐ ' : '') + r.name
    }));
    Focus.openSelector(options, this.reciter, (v) => this.setReciter(v), 'اختر القارئ');
  },
  
  openReciters(){ this.openReciterPicker(); },
  
  openRepeatPicker(){
    const options = [
      { value:'0', label:'بدون تكرار' },
      { value:'1', label:'مرة إضافية' },
      { value:'2', label:'مرتان' },
      { value:'5', label:'5 مرات (للحفظ)' }
    ];
    
    Focus.openSelector(options, String(this.repeat), (v) => {
      this.repeat = parseInt(v, 10);
      Store.set('repeat', this.repeat);
      this.renderSetRepeatLabel();
      toast('التكرار: ' + (options.find(o => o.value === v) || {}).label);
    }, 'تكرار الآية');
  },
  
  setRepeat(v){
    this.repeat = parseInt(v, 10);
    Store.set('repeat', v);
    this.renderSetRepeatLabel();
  },
  
  renderList(){
    const box = document.getElementById('surahList');
    if(!box) return;
    box.innerHTML = '';
    
    SURAHS.forEach(s => {
      const d = document.createElement('div');
      d.className = 'surah-item';
      d.dataset.name = s[1];
      d.setAttribute('data-focus', '');
      d.innerHTML = 
        '<div class="surah-num">' + s[0] + '</div>' +
        '<div class="surah-info">' +
          '<div class="surah-name">' + s[1] + '</div>' +
          '<div class="surah-meta">' + s[3] + ' • ' + s[2] + ' آية</div>' +
        '</div>';
      
      d.onclick = () => this.openSurah(s[0]);
      box.appendChild(d);
    });
  },
  
  filterList(q){
    const t = q.trim();
    document.querySelectorAll('#surahList .surah-item').forEach(el => {
      el.style.display = el.dataset.name.includes(t) ? 'flex' : 'none';
    });
  },
  
  async openSurah(n){
    this.currentSurah = n;
    this.currentAyah = 1;
    
    const s = SURAHS[n - 1];
    document.getElementById('surahTitle').textContent = 'سورة ' + s[1];
    document.getElementById('surahSub').textContent = s[3] + ' • ' + s[2] + ' آية';
    document.getElementById('quranListView').classList.add('hidden');
    document.getElementById('quranSurahView').classList.remove('hidden');
    this.enterFullscreen();
    try{ Swipe.hintOnce(); }catch(e){}
    
    const c = document.getElementById('surahContent');
    Loading.show(c, 'جارٍ التحميل...');
    
    let ayahList = null;
    if(typeof QuranOffline !== 'undefined' && await QuranOffline.ensure()){
      ayahList = QuranOffline.surahAyahs(n);
    }
    
    if(!ayahList){
      const result = await Loading.fetchJSON(
        'https://api.alquran.cloud/v1/surah/' + n + '/quran-uthmani'
      );
      
      if(!result.ok || !result.data.data || !result.data.data.ayahs){
        Loading.error(c, 'فشل التحميل — تحقق من الإنترنت', () => this.openSurah(n));
        return;
      }
      ayahList = result.data.data.ayahs;
    }
    
    this.ayahs = ayahList;
    this.renderAyahs(s);
    
    if(Focus.enabled) setTimeout(() => {
      Focus.current = null;
      Focus.reset();
    }, 200);
  },
  
  renderAyahs(s){
    const c = document.getElementById('surahContent');
    let h = '';
    
    if(s[0] !== 1 && s[0] !== 9){
      h += '<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>';
    }
    
    this.ayahs.forEach((a, i) => {
      const n = i + 1;
      h += '<div class="ayah" id="ayah-' + n + '" onclick="Quran.playFrom(' + n + ')">' +
        '<span class="ayah-text">' + a.text + '</span> ' +
        '<span class="ayah-num">' + n + '</span>' +
      '</div>';
    });
    
    c.innerHTML = h;
    c.scrollTop = 0;
  },
  
  backToList(){
    this.stop();
    this.exitFullscreen();
    document.getElementById('quranSurahView').classList.add('hidden');
    document.getElementById('quranListView').classList.remove('hidden');
    
    if(Focus.enabled) setTimeout(() => {
      Focus.current = null;
      Focus.reset();
    }, 200);
  },
  
  goSurah(dir){
    this.stop();
    let n = this.currentSurah + dir;
    if(n < 1) n = 114;
    if(n > 114) n = 1;
    this.openSurah(n);
  },
  
  ayahUrl(r, s, a){
    const rec = RECITERS.find(x => x.id === r);
    const folder = rec ? rec.folder : 'Ghamadi_40kbps';
    return 'https://everyayah.com/data/' + folder + '/' +
      String(s).padStart(3, '0') + String(a).padStart(3, '0') + '.mp3';
  },
  
  playFrom(n){
    if(!this.ayahs.length) return;
    
    try{
      if(typeof QuranListen !== 'undefined' && QuranListen.audio && !QuranListen.audio.paused){
        QuranListen.audio.pause();
        QuranListen.playing = false;
        QuranListen.updatePlayBtn();
      }
    } catch(e){}
    
    try{
      if(typeof Adhan !== 'undefined' && Adhan.audio && !Adhan.audio.paused){
        Adhan.stop();
      }
    } catch(e){}
    
    this.currentAyah = n;
    this.repeatCount = 0;
    this.audio.src = this.ayahUrl(this.reciter, this.currentSurah, n);
    
    this.audio.play().catch(() => toast('تعذر تشغيل الصوت'));
    
    this.playing = true;
    this.updatePlayBtn();
    this.highlight(n);
    this.scrollTo(n);
    try{ Bookmark.saveQuran(this.currentSurah, n); } catch(e){}
  },
  
  playNext(){
    if(this.repeat > 0 && this.repeatCount < this.repeat){
      this.repeatCount++;
      this.playFrom(this.currentAyah);
      return;
    }
    
    this.repeatCount = 0;
    
    if(this.currentAyah < this.ayahs.length){
      this.playFrom(this.currentAyah + 1);
    } else {
      toast('✅ انتهت السورة');
      this.playing = false;
      this.updatePlayBtn();
    }
  },
  
  playPause(){
    if(this.playing){
      this.audio.pause();
      this.playing = false;
    } else {
      if(this.currentAyah === 0) this.playFrom(1);
      else this.audio.play().catch(()=>{});
      this.playing = true;
    }
    this.updatePlayBtn();
  },
  
  updatePlayBtn(){
    const b = document.getElementById('btnPlayPause');
    if(b) b.textContent = this.playing ? '⏸ إيقاف' : '▶ تشغيل';
  },
  
  stop(){
    this.audio.pause();
    this.playing = false;
    this.updatePlayBtn();
    document.querySelectorAll('.ayah.active').forEach(el => el.classList.remove('active'));
  },
  
  prevAyah(){
    if(this.currentAyah > 1) this.playFrom(this.currentAyah - 1);
  },
  
  nextAyah(){
    if(this.currentAyah < this.ayahs.length) this.playFrom(this.currentAyah + 1);
  },
  
  cycleRepeat(){
    const opts = [0, 1, 2, 5];
    const labels = ['لا تكرار', '×1', '×2', '×5'];
    const i = opts.indexOf(this.repeat);
    const ni = (i + 1) % opts.length;
    
    this.repeat = opts[ni];
    Store.set('repeat', this.repeat);
    
    const btn = document.getElementById('repeatBtn');
    if(btn) btn.textContent = '🔁 ' + labels[ni];
    
    this.renderSetRepeatLabel();
    toast('التكرار: ' + labels[ni]);
  },
  
  highlight(n){
    document.querySelectorAll('.ayah.active').forEach(el => el.classList.remove('active'));
    const el = document.getElementById('ayah-' + n);
    if(el) el.classList.add('active');
  },
  
  scrollTo(n){
    const el = document.getElementById('ayah-' + n);
    if(el) el.scrollIntoView({ behavior:'smooth', block:'center' });
  }
};

/* ============================================================
   QuranListen — القرآن للاستماع (سورة كاملة)
   ============================================================ */
const QuranListen = {
  currentSurah: 0,
  currentReciter: 'sds',
  playing: false,
  audio: null,
  duration: 0,
  continuous: true,
  repeatSurah: false,
  
  init(){
    this.audio = document.getElementById('listenAudio');
    if(!this.audio) return;
    
    this.currentReciter = Store.get('listenReciter', 'sds');
    if(!LISTEN_RECITERS.some(x => x.id === this.currentReciter)) this.currentReciter = 'sds';
    this.continuous = Store.get('listenContinuous', true);
    this.repeatSurah = Store.get('listenRepeatSurah', false);
    
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration || 0;
      this.updateProgress();
    });
    this.audio.addEventListener('ended', () => {
      if(this.continuous !== false) this.next();
    });
    
    this.renderList();
    this.updateReciterDisplay();
    
    setTimeout(() => {
      this.updateContinuousBtn();
      this.updateRepeatBtn();
    }, 100);
  },
  
  updateReciterDisplay(){
    const r = LISTEN_RECITERS.find(x => x.id === this.currentReciter) || LISTEN_RECITERS[0];
    const el = document.getElementById('currentListenReciter');
    if(el) el.textContent = r.name;
  },
  
  openReciters(){
    const options = LISTEN_RECITERS.map(r => ({ value:r.id, label:r.name }));
    Focus.openSelector(options, this.currentReciter, (v) => {
      this.currentReciter = v;
      Store.set('listenReciter', v);
      this.updateReciterDisplay();
      toast('القارئ: ' + LISTEN_RECITERS.find(x => x.id === v).name);
    }, 'اختر القارئ');
  },
  
  setReciter(id){
    this.currentReciter = id;
    Store.set('listenReciter', id);
    this.updateReciterDisplay();
    toast('القارئ: ' + LISTEN_RECITERS.find(x => x.id === id).name);
  },
  
  url(surah){
    const r = LISTEN_RECITERS.find(x => x.id === this.currentReciter) || LISTEN_RECITERS[0];
    return r.server + String(surah).padStart(3, '0') + '.mp3';
  },
  
  renderList(){
    const box = document.getElementById('listenList');
    if(!box) return;
    box.innerHTML = '';
    
    SURAHS.forEach(s => {
      const d = document.createElement('div');
      d.className = 'surah-item';
      d.dataset.name = s[1];
      d.setAttribute('data-focus', '');
      d.innerHTML = 
        '<div class="surah-num">' + s[0] + '</div>' +
        '<div class="surah-info">' +
          '<div class="surah-name">' + s[1] + '</div>' +
          '<div class="surah-meta">' + s[3] + ' • ' + s[2] + ' آية</div>' +
        '</div>';
      
      d.onclick = () => this.playFrom(s[0]);
      box.appendChild(d);
    });
  },
  
  filter(q){
    const t = q.trim();
    document.querySelectorAll('#listenList .surah-item').forEach(el => {
      el.style.display = el.dataset.name.includes(t) ? 'flex' : 'none';
    });
  },
  
  playFrom(n){
    if(!n) return;
    
    try{
      if(typeof Quran !== 'undefined' && Quran.audio && !Quran.audio.paused){
        Quran.audio.pause();
        Quran.playing = false;
        Quran.updatePlayBtn();
      }
    } catch(e){}
    
    this.currentSurah = n;
    const s = SURAHS[n - 1];
    
    document.getElementById('lpTitle').textContent = 'سورة ' + s[1];
    const r = LISTEN_RECITERS.find(x => x.id === this.currentReciter);
    document.getElementById('lpSub').textContent = r ? r.name : '';
    
    this.duration = 0;
    this.audio.src = this.url(n);
    this.audio.load();
    
    this.audio.play()
      .then(() => {
        this.playing = true;
        this.updatePlayBtn();
        try{ Bookmark.saveListen(n); } catch(e){}
      })
      .catch(() => toast('تعذر التشغيل'));
    
    this.highlight(n);
  },
  
  playPause(){
    if(!this.audio.src){
      this.playFrom(1);
      return;
    }
    
    if(this.playing){
      this.audio.pause();
      this.playing = false;
    } else {
      this.audio.play().catch(()=>{});
      this.playing = true;
    }
    this.updatePlayBtn();
  },
  
  updatePlayBtn(){
    const b = document.getElementById('lpPlayBtn');
    if(b) b.textContent = this.playing ? '⏸' : '▶';
  },
  
  next(){
    if(this.repeatSurah){
      this.playFrom(this.currentSurah);
      return;
    }
    
    let n = this.currentSurah + 1;
    if(n > 114){
      toast('✅ ختمت القرآن');
      n = 1;
    }
    this.playFrom(n);
  },
  
  prev(){
    if(this.audio && this.audio.currentTime > 3){
      this.audio.currentTime = 0;
      return;
    }
    
    let n = this.currentSurah - 1;
    if(n < 1) n = 114;
    this.playFrom(n);
  },
  
  seek(e){
    if(!this.duration) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = 1 - (x / rect.width);
    this.audio.currentTime = this.duration * pct;
  },
  
  updateProgress(){
    const fill = document.getElementById('lpFill');
    const cur = document.getElementById('lpCur');
    const dur = document.getElementById('lpDur');
    
    if(fill && this.duration) fill.style.width = (this.audio.currentTime / this.duration * 100) + '%';
    if(cur) cur.textContent = this.fmt(this.audio.currentTime);
    if(dur) dur.textContent = this.fmt(this.duration || 0);
  },
  
  fmt(s){
    if(!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  },
  
  toggleContinuous(){
    this.continuous = !this.continuous;
    Store.set('listenContinuous', this.continuous);
    this.updateContinuousBtn();
    toast(this.continuous ? '🔁 متتالي مُفعَّل' : '⏹ مُعطَّل');
  },
  
  updateContinuousBtn(){
    const b = document.getElementById('lpContBtn');
    if(b) b.textContent = '🔁 متتالي: ' + (this.continuous ? 'نعم' : 'لا');
  },
  
  toggleRepeatSurah(){
    this.repeatSurah = !this.repeatSurah;
    Store.set('listenRepeatSurah', this.repeatSurah);
    this.updateRepeatBtn();
    toast(this.repeatSurah ? '🔂 تكرار مُفعَّل' : '🔂 مُعطَّل');
  },
  
  updateRepeatBtn(){
    const b = document.getElementById('lpRepeatBtn');
    if(b) b.textContent = '🔂 تكرار: ' + (this.repeatSurah ? 'نعم' : 'لا');
  },
  
  highlight(n){
    document.querySelectorAll('#listenList .surah-item').forEach((el, i) => {
      if(i + 1 === n) el.classList.add('active');
      else el.classList.remove('active');
    });
    
    const el = document.querySelectorAll('#listenList .surah-item')[n - 1];
    if(el) el.scrollIntoView({ behavior:'smooth', block:'center' });
  }
};
