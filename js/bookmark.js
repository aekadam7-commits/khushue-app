/* ============================================================
   خُشوع — bookmark.js
   حفظ المواضع: آخر قراءة + آخر استماع
   ============================================================ */

const Bookmark = {
  saveQuran(surah, ayah){
    if(!surah || !ayah) return;
    Store.set('quranLast', {
      surah: surah,
      ayah: ayah,
      time: Date.now()
    });
  },
  
  getQuran(){
    return Store.get('quranLast', null);
  },
  
  async continueQuran(){
    const last = this.getQuran();
    if(!last || !last.surah){
      toast('لا يوجد موضع محفوظ');
      return;
    }
    
    if(typeof Quran === 'undefined'){
      toast('⏳ انتظر تحميل القرآن');
      return;
    }
    
    await Quran.openSurah(last.surah);
    
    setTimeout(() => {
      Quran.highlight(last.ayah);
      Quran.scrollTo(last.ayah);
      toast('📖 متابعة من سورة ' + SURAHS[last.surah - 1][1] + ' — الآية ' + last.ayah);
    }, 800);
  },
  
  clearQuran(){
    Store.set('quranLast', null);
    toast('تم مسح موضع القرآن');
  },
  
  saveListen(surah){
    if(!surah) return;
    Store.set('listenLast', {
      surah: surah,
      time: Date.now()
    });
  },
  
  getListen(){
    return Store.get('listenLast', null);
  },
  
  continueListen(){
    const last = this.getListen();
    if(!last || !last.surah){
      toast('لا يوجد موضع محفوظ');
      return;
    }
    
    if(typeof QuranListen === 'undefined'){
      toast('⏳ انتظر تحميل القرآن');
      return;
    }
    
    QuranListen.playFrom(last.surah);
    toast('🎧 متابعة من سورة ' + SURAHS[last.surah - 1][1]);
  },
  
  clearListen(){
    Store.set('listenLast', null);
    toast('تم مسح موضع الاستماع');
  },
  
  saveMushaf(page){
    if(!page) return;
    Store.set('mushafPage', page);
  },
  
  getMushaf(){
    return parseInt(Store.get('mushafPage', '1'), 10) || 1;
  },
  
  continueMushaf(){
    if(typeof Mushaf === 'undefined'){
      toast('⏳ انتظر تحميل المصحف');
      return;
    }
    const page = this.getMushaf();
    Mushaf.load(page);
    toast('📖 متابعة من الصفحة ' + page);
  },
  
  showMenu(){
    const quran = this.getQuran();
    const listen = this.getListen();
    const mushafPage = this.getMushaf();
    
    let html = '<h3>🔖 مواضع القراءة</h3>';
    
    html += '<div class="reciter-option" data-focus ' +
      'onclick="Bookmark.continueQuran();App.closeModal()">' +
        '<span>📖 القرآن (للحفظ)</span>' +
        '<span class="ro-ruwaya" style="font-size:11px">' +
          (quran ? 'سورة ' + SURAHS[quran.surah - 1][1] + ' — آية ' + quran.ayah : 'لا يوجد') +
        '</span>' +
      '</div>';
    
    html += '<div class="reciter-option" data-focus ' +
      'onclick="Bookmark.continueListen();App.closeModal()">' +
        '<span>🎧 القرآن (للاستماع)</span>' +
        '<span class="ro-ruwaya" style="font-size:11px">' +
          (listen ? 'سورة ' + SURAHS[listen.surah - 1][1] : 'لا يوجد') +
        '</span>' +
      '</div>';
    
    html += '<div class="reciter-option" data-focus ' +
      'onclick="Bookmark.continueMushaf();App.closeModal()">' +
        '<span>📚 المصحف</span>' +
        '<span class="ro-ruwaya" style="font-size:11px">الصفحة ' + mushafPage + '</span>' +
      '</div>';
    
    html += '<button class="btn-secondary" data-focus ' +
      'onclick="Bookmark.clearAll()" ' +
      'style="width:100%;margin-top:12px;border-color:#ef4444;color:#dc2626">' +
      '🗑️ مسح كل المواضع' +
    '</button>';
    
    html += '<button class="btn-secondary" data-focus ' +
      'onclick="App.closeModal()" style="width:100%;margin-top:8px">إغلاق</button>';
    
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  },
  
  clearAll(){
    Store.set('quranLast', null);
    Store.set('listenLast', null);
    try{ App.closeModal(); } catch(e){}
    toast('✅ تم مسح كل المواضع');
  }
};
