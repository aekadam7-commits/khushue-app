/* ============================================================
   خُشوع — mushaf.js
   المصحف للقراءة بنظام الصفحات
   ============================================================ */

const Mushaf = {
  currentPage: 1,
  totalPages: 604,
  fontSize: 26,
  nightReading: false,
  
  init(){
    this.currentPage = parseInt(Store.get('mushafPage', '1'), 10) || 1;
    this.fontSize = parseInt(Store.get('mushafFontSize', '26'), 10) || 26;
    this.nightReading = Store.get('mushafNight', false) || false;
    
    this.renderFontLabel();
    this.applyFont();
    
    if(this.nightReading){
      document.body.classList.add('night-reading');
    }
    
    window.addEventListener('popstate', () => {
      if(this._silentPop){ this._silentPop = false; return; }
      if(document.body.classList.contains('mushaf-fs')){ this._fsHist = false; this.exitFullscreen(); }
    });
  },
  
  // ============ ملء الشاشة ============
  enterFullscreen(){
    document.body.classList.add('mushaf-fs');
    if(!this._fsHist){ try{ history.pushState({ mushafFs:1 }, ''); this._fsHist = true; }catch(e){} }
    window.scrollTo(0, 0);
    if(Focus.enabled) setTimeout(() => { Focus.current = null; Focus.reset(); }, 200);
  },
  
  exitFullscreen(){
    document.body.classList.remove('mushaf-fs');
    if(this._fsHist){
      this._fsHist = false;
      this._silentPop = true;
      try{ history.back(); }catch(e){ this._silentPop = false; }
    }
  },
  
  toggleFullscreen(){
    if(document.body.classList.contains('mushaf-fs')) this.exitFullscreen();
    else this.enterFullscreen();
  },
  
  async load(page){
    if(!page) page = this.currentPage;
    page = Math.max(1, Math.min(this.totalPages, page));
    
    this.currentPage = page;
    Store.set('mushafPage', page);
    Bookmark.saveMushaf(page);
    
    const view = document.getElementById('mushafView');
    const title = document.getElementById('mushafTitle');
    
    if(!view) return;
    if(title) title.textContent = 'الصفحة ' + page + ' من ' + this.totalPages;
    const fsTitle = document.getElementById('mushafFsTitle');
    if(fsTitle) fsTitle.textContent = 'الصفحة ' + page + ' من ' + this.totalPages;
    
    Loading.show(view, 'جارٍ التحميل...');
    
    let ayahs = null;
    if(typeof QuranOffline !== 'undefined' && await QuranOffline.ensure()){
      ayahs = QuranOffline.pageAyahs(page);
    }
    
    if(!ayahs){
      const result = await Loading.fetchJSON(
        'https://api.alquran.cloud/v1/page/' + page + '/quran-uthmani'
      );
      
      if(!result.ok || !result.data.data || !result.data.data.ayahs){
        Loading.error(view, 'فشل التحميل', () => this.load(page));
        return;
      }
      ayahs = result.data.data.ayahs;
    }
    let html = '<div class="mushaf-header">الصفحة ' + page + ' من ' + this.totalPages + '</div>';
    
    let lastSurah = null;
    let inText = false;
    
    for(let i = 0; i < ayahs.length; i++){
      const a = ayahs[i];
      const sn = a.surah.number;
      const sname = a.surah.name.replace(/^سورة\s+/, '');
      
      if(sn !== lastSurah){
        if(inText){ html += '</div>'; inText = false; }
        
        html += '<div class="mushaf-surah-sep">سورة ' + sname + '</div>';
        
        if(a.numberInSurah === 1 && sn !== 1 && sn !== 9){
          html += '<div class="mushaf-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>';
        }
        
        html += '<div class="mushaf-text">';
        inText = true;
        lastSurah = sn;
      }
      
      html += a.text + ' <span class="mushaf-num">﴿' + a.numberInSurah + '﴾</span> ';
    }
    
    if(inText) html += '</div>';
    
    view.innerHTML = html;
    window.scrollTo({ top:0, behavior:'smooth' });
    view.scrollTop = 0;
    
    if(Focus.enabled) setTimeout(() => {
      Focus.current = null;
      Focus.reset();
    }, 200);
  },
  
  next(){
    if(this.currentPage < this.totalPages) this.load(this.currentPage + 1);
  },
  
  prev(){
    if(this.currentPage > 1) this.load(this.currentPage - 1);
  },
  
  gotoPage(){
    const p = prompt('أدخل رقم الصفحة (1 - ' + this.totalPages + '):', this.currentPage);
    if(p){
      const n = parseInt(p, 10);
      if(n >= 1 && n <= this.totalPages) this.load(n);
      else toast('❌ رقم غير صحيح');
    }
  },
  
  openMenu(){
    const h = 
      '<h3>📚 مصحف للقراءة</h3>' +
      '<div class="reciter-option" data-focus onclick="Mushaf.continueReading();App.closeModal()">' +
        '<span>📖 متابعة القراءة</span>' +
        '<span class="ro-ruwaya" style="font-size:11px">الصفحة ' + this.currentPage + '</span>' +
      '</div>' +
      '<div class="reciter-option" data-focus onclick="Mushaf.startOver();App.closeModal()">' +
        '<span>🔄 البدء من جديد</span>' +
        '<span class="ro-ruwaya" style="font-size:11px">الفاتحة</span>' +
      '</div>' +
      '<div class="reciter-option" data-focus onclick="Mushaf.gotoPage();App.closeModal()">' +
        '<span>🔢 الذهاب إلى صفحة</span>' +
        '<span class="ro-ruwaya" style="font-size:11px">1 - 604</span>' +
      '</div>' +
      '<div class="reciter-option" data-focus onclick="Mushaf.chooseSurah();App.closeModal()">' +
        '<span>📑 اختيار سورة</span>' +
        '<span class="ro-ruwaya" style="font-size:11px">114 سورة</span>' +
      '</div>';
    
    document.getElementById('modalContent').innerHTML = h;
    document.getElementById('modal').classList.remove('hidden');
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  },
  
  continueReading(){
    this.load(this.currentPage);
    toast('📖 متابعة من الصفحة ' + this.currentPage);
  },
  
  startOver(){
    this.load(1);
    toast('📖 بدء من الفاتحة');
  },
  
  chooseSurah(){
    let h = '<h3>📖 اختر سورة</h3>' +
      '<input type="text" class="city-search" placeholder="🔍 ابحث..." ' +
      'oninput="Mushaf.filterSurah(this.value)">' +
      '<div class="city-list" id="mushafSurahList">';
    
    SURAHS.forEach(s => {
      h += '<div class="city-item" data-focus data-name="' + s[1] + '" ' +
        'onclick="Mushaf.gotoSurah(' + s[0] + ');App.closeModal()">' +
        '<span>' + s[0] + '. سورة ' + s[1] + '</span>' +
        '<span class="country">' + s[2] + ' آية</span>' +
        '</div>';
    });
    
    h += '</div>';
    document.getElementById('modalContent').innerHTML = h;
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  },
  
  filterSurah(q){
    const t = q.trim();
    document.querySelectorAll('#mushafSurahList .city-item').forEach(el => {
      el.style.display = el.dataset.name.includes(t) ? 'flex' : 'none';
    });
  },
  
  async gotoSurah(surahNum){
    if(typeof QuranOffline !== 'undefined' && await QuranOffline.ensure()){
      const p = QuranOffline.surahFirstPage(surahNum);
      if(p){ this.load(p); return; }
    }
    
    const result = await Loading.fetchJSON(
      'https://api.alquran.cloud/v1/ayah/' + surahNum + ':1/quran-uthmani'
    );
    
    if(result.ok && result.data.data && result.data.data.page){
      this.load(result.data.data.page);
    } else {
      toast('⚠️ تعذر تحديد الصفحة');
    }
  },
  
  // ============ وضع القراءة الليلية ============
  toggleNight(){
    this.nightReading = !this.nightReading;
    Store.set('mushafNight', this.nightReading);
    document.body.classList.toggle('night-reading', this.nightReading);
    toast(this.nightReading ? '🌙 القراءة الليلية' : '☀️ القراءة النهارية');
  },
  
  // ============ تكبير / تصغير خط المصحف ============
  setFontSize(size){
    this.fontSize = parseInt(size, 10) || 26;
    Store.set('mushafFontSize', this.fontSize);
    this.applyFont();
    this.renderFontLabel();
  },
  
  applyFont(){
    const view = document.querySelector('.mushaf-text');
    if(view) view.style.fontSize = this.fontSize + 'px';
    
    // عند تحميل جديد نطبق
    document.documentElement.style.setProperty('--mushaf-fs', this.fontSize + 'px');
  },
  
  renderFontLabel(){
    const el = document.getElementById('mushafFontLabel');
    if(el) el.textContent = this.fontSize;
  },
  
  increaseFont(){
    if(this.fontSize < 42) this.setFontSize(this.fontSize + 2);
  },
  
  decreaseFont(){
    if(this.fontSize > 18) this.setFontSize(this.fontSize - 2);
  }
};
