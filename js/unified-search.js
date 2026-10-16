/* ============================================================
   خُشوع — unified-search.js
   البحث الموحد
   ============================================================ */

const UnifiedSearch = {
  init(){},
  
  search(query){
    if(!query || query.length < 2) return [];
    
    const q = query.trim().toLowerCase();
    const results = [];
    
    // 1) السور
    SURAHS.forEach(s => {
      if(s[1].includes(q) || String(s[0]) === q){
        results.push({
          type: 'surah',
          icon: '📖',
          title: 'سورة ' + s[1],
          desc: s[3] + ' • ' + s[2] + ' آية',
          action: () => {
            App.go('quran');
            setTimeout(() => {
              Quran.openSurah(s[0]);
            }, 300);
          },
          category: 'القرآن'
        });
      }
    });
    
    // 2) أسماء الله
    NAMES99.forEach((n, i) => {
      if(n[0].includes(q) || n[1].includes(q)){
        results.push({
          type: 'name',
          icon: '🌟',
          title: n[0],
          desc: n[1],
          action: () => toast(n[1]),
          category: 'أسماء الله'
        });
      }
    });
    
    // 3) المدن
    CITIES.forEach(c => {
      if(c[0].includes(q) || c[1].includes(q)){
        results.push({
          type: 'city',
          icon: '📍',
          title: c[0],
          desc: c[1],
          action: () => {
            Store.set('cityData', {
              city:c[0], country:c[1], lat:c[2], lng:c[3], source:'search'
            });
            Prayer.city = c[0];
            Prayer.country = c[1];
            Prayer.coords = { lat:c[2], lng:c[3] };
            Prayer.render();
            if(typeof Qibla !== 'undefined') Qibla.compute(c[2], c[3]);
            if(typeof Adhan !== 'undefined') Adhan.scheduleToday(true);
            App.go('prayer');
            toast('✅ ' + c[0]);
          },
          category: 'المدن'
        });
      }
    });
    
    // 4) الأذكار
    ADHKAR.forEach(cat => {
      cat.items.forEach(it => {
        if(it.t.includes(q)){
          const preview = it.t.length > 60 ? it.t.slice(0, 60) + '...' : it.t;
          results.push({
            type: 'dhikr',
            icon: '📿',
            title: cat.cat,
            desc: preview,
            action: () => {
              App.go('adhkar');
              Adhkar.currentCat = ADHKAR.findIndex(c => c.cat === cat.cat);
              Adhkar.renderAll();
            },
            category: 'الأذكار'
          });
        }
      });
    });
    
    // 5) القرّاء (للحفظ)
    RECITERS.forEach(r => {
      if(r.name.includes(q)){
        results.push({
          type: 'reciter',
          icon: '🎙️',
          title: r.name,
          desc: 'قارئ للقرآن',
          action: () => {
            Quran.setReciter(r.id);
            App.go('quran');
          },
          category: 'القرّاء'
        });
      }
    });
    
    // 6) القرّاء (للاستماع)
    LISTEN_RECITERS.forEach(r => {
      if(r.name.includes(q)){
        results.push({
          type: 'reciter',
          icon: '🎧',
          title: r.name,
          desc: 'قارئ للاستماع',
          action: () => {
            QuranListen.setReciter(r.id);
            App.go('quran-listen');
          },
          category: 'القرّاء'
        });
      }
    });
    
    const priority = {
      'القرآن': 1,
      'أسماء الله': 2,
      'القرّاء': 3,
      'المدن': 4,
      'الأذكار': 5
    };
    
    results.sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99));
    
    return results.slice(0, 30);
  },
  
  showResults(query){
    const results = this.search(query);
    
    let html = '<h3>🔍 نتائج البحث</h3>';
    
    if(results.length === 0){
      html += '<div class="empty-state">' +
          '<div class="empty-ico">🔍</div>' +
          '<div class="empty-title">لا توجد نتائج</div>' +
          '<div class="empty-text">جرب كلمة أخرى</div>' +
      '</div>';
    } else {
      results.forEach((r, idx) => {
        html += '<div class="reciter-option" data-focus data-search-idx="' + idx + '">' +
            '<span><strong>' + r.icon + ' ' + r.title + '</strong><br>' +
            '<small style="color:var(--muted);font-size:11px">' + r.category + ' • ' + r.desc + '</small></span>' +
            '<span style="color:var(--gold)">←</span>' +
        '</div>';
      });
    }
    
    html += '<button class="btn-secondary" data-focus onclick="App.closeModal()" style="width:100%;margin-top:10px">إغلاق</button>';
    
    const modalContent = document.getElementById('modalContent');
    if(!modalContent) return;
    modalContent.innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    
    document.querySelectorAll('[data-search-idx]').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.getAttribute('data-search-idx'));
        App.closeModal();
        setTimeout(() => results[idx].action(), 100);
      };
    });
    
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  },
  
  openSearchDialog(){
    const query = prompt('🔍 ابحث عن سورة، قارئ، ذكر، اسم من أسماء الله، أو مدينة:');
    if(query && query.length >= 2){
      this.showResults(query);
    }
  }
};

const QuranSearch = {
  async search(query){
    if(!query || query.length < 2) return { ok:false, results:[] };
    
    // بحث محلي في نص القرآن (دون إنترنت)
    if(typeof QuranOffline !== 'undefined'){
      try{
        const off = await QuranOffline.search(query);
        if(off) return { ok:true, count:off.count, results:off.results };
      } catch(e){}
    }
    
    try{
      const url = 'https://api.alquran.cloud/v1/search/' + 
                  encodeURIComponent(query) + '/all/ar';
      
      const result = await Loading.fetchJSON(url);
      
      if(!result.ok || !result.data.data) return { ok:false, results:[] };
      
      return {
        ok: true,
        count: result.data.data.count || 0,
        results: result.data.data.matches || []
      };
    } catch(e){
      return { ok:false, results:[] };
    }
  },
  
  async showSearch(){
    let html = 
      '<h3>🔍 البحث في القرآن</h3>' +
      '<input type="text" class="city-search" id="quranSearchInput" ' +
        'placeholder="ابحث عن كلمة في القرآن..." ' +
        'oninput="QuranSearch.onInput(this.value)" ' +
        'style="margin-bottom:14px">' +
      '<div id="quranSearchResults" style="max-height:55vh;overflow-y:auto">' +
        '<div class="text-center text-muted" style="padding:20px;font-size:13px">' +
          'اكتب كلمة للبحث<br>' +
          '<small style="opacity:.7">أمثلة: الصبر، الرحمة، الجنة</small>' +
        '</div>' +
      '</div>' +
      '<button class="btn-secondary" data-focus ' +
        'onclick="App.closeModal()" style="width:100%;margin-top:10px">إغلاق</button>';
    
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  },
  
  onInput: debounce(async function(query){
    const box = document.getElementById('quranSearchResults');
    if(!box) return;
    
    if(!query || query.length < 2){
      box.innerHTML = '<div class="text-center text-muted" style="padding:20px;font-size:13px">اكتب كلمتين على الأقل</div>';
      return;
    }
    
    Loading.show(box, 'جارٍ البحث...');
    
    const result = await QuranSearch.search(query);
    
    if(!result.ok){
      box.innerHTML = '<div class="text-center text-muted" style="padding:20px;font-size:13px">⚠️ تعذر البحث — تحقق من الإنترنت</div>';
      return;
    }
    
    if(result.results.length === 0){
      box.innerHTML = '<div class="text-center text-muted" style="padding:20px;font-size:13px">لا توجد نتائج لـ «' + query + '»</div>';
      return;
    }
    
    let html = '<div class="text-center" style="margin-bottom:10px;font-size:12px;color:var(--gold-3);font-weight:800">' +
      'عدد النتائج: ' + result.count +
    '</div>';
    
    result.results.slice(0, 30).forEach(m => {
      const text = m.text || '';
      const surahName = m.surah ? m.surah.name.replace(/^سورة\s+/, '') : '';
      const ayahNum = m.numberInSurah || '';
      
      const highlighted = m.html || text.replace(
        new RegExp(query, 'gi'),
        '<mark style="background:rgba(201,169,97,.3);color:inherit;border-radius:4px;padding:0 3px">$&</mark>'
      );
      
      html += '<div class="dhikr-card" style="margin-bottom:10px;cursor:pointer" ' +
        'data-focus ' +
        'onclick="QuranSearch.openAyah(' + (m.surah ? m.surah.number : 0) + ',' + ayahNum + ')">' +
          '<div class="dhikr-text" style="font-size:17px;line-height:2">' + highlighted + '</div>' +
          '<div class="dhikr-count">📖 سورة ' + surahName + ' — آية ' + ayahNum + '</div>' +
        '</div>';
    });
    
    box.innerHTML = html;
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  }, 500),
  
  async openAyah(surahNum, ayahNum){
    if(!surahNum || !ayahNum){
      toast('⚠️ لا يمكن فتح الآية');
      return;
    }
    
    App.closeModal();
    App.go('quran');
    
    await Quran.openSurah(surahNum);
    
    setTimeout(() => {
      Quran.highlight(ayahNum);
      Quran.scrollTo(ayahNum);
      Quran.playFrom(ayahNum);
    }, 800);
  }
};
