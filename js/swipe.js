/* ============================================================
   خُشوع — swipe.js
   السحب بالإصبع للتنقل في صفحات القراءة
   اتجاه عربي (كتاب من اليمين لليسار):
     سحب نحو اليمين ← التالي     سحب نحو اليسار ← السابق
   ============================================================ */
const Swipe = {
  MIN_DX: 60,      // أقل مسافة أفقية (px)
  RATIO: 1.6,      // الأفقي يجب أن يغلب العمودي
  MAX_MS: 900,
  EDGE: 24,        // تجاهل اللمس عند حافة الشاشة (إيماءة رجوع النظام)

  attach(el, onNext, onPrev){
    if(!el || el._swipeBound) return;
    el._swipeBound = true;
    let sx = 0, sy = 0, st = 0, ok = false;

    el.addEventListener('touchstart', e => {
      ok = false;
      if(e.touches.length !== 1) return;
      const t = e.touches[0];
      if(t.clientX < this.EDGE || t.clientX > window.innerWidth - this.EDGE) return;
      if(e.target.closest && e.target.closest('input,textarea,select,[data-noswipe],.surah-toolbar,.mushaf-controls')) return;
      sx = t.clientX; sy = t.clientY; st = Date.now(); ok = true;
    }, { passive:true });

    el.addEventListener('touchend', e => {
      if(!ok) return;
      ok = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if(Date.now() - st > this.MAX_MS) return;
      if(Math.abs(dx) < this.MIN_DX || Math.abs(dx) < Math.abs(dy) * this.RATIO) return;
      const next = dx > 0;
      const done = next ? onNext() : onPrev();
      if(done !== false) this.animate(el, next);
    }, { passive:true });

    el.addEventListener('touchcancel', () => { ok = false; }, { passive:true });
  },

  animate(el, next){
    el.classList.remove('swipe-anim-next','swipe-anim-prev');
    void el.offsetWidth;
    el.classList.add(next ? 'swipe-anim-next' : 'swipe-anim-prev');
  },

  hintOnce(){
    try{
      if(Store.get('swipeHint', false)) return;
      Store.set('swipeHint', true);
      toast('↔ اسحب يمينًا للتالي ويسارًا للسابق');
    } catch(e){}
  },

  init(){
    // قرآن للحفظ: سورة تالية / سابقة
    this.attach(document.getElementById('surahContent'),
      () => { if(Quran.currentSurah < 114){ Quran.goSurah(1); return true; } return false; },
      () => { if(Quran.currentSurah > 1){ Quran.goSurah(-1); return true; } return false; });

    // المصحف: صفحة تالية / سابقة
    this.attach(document.getElementById('mushafView'),
      () => { if(Mushaf.currentPage < Mushaf.totalPages){ Mushaf.next(); return true; } return false; },
      () => { if(Mushaf.currentPage > 1){ Mushaf.prev(); return true; } return false; });

    // السيرة / الأنبياء / حصن المسلم / الأحداث
    const body = document.getElementById('islamicReaderBody');
    const ov = document.getElementById('islamicReaderOverlay');
    const nextI = () => { const s = IslamicSections; if(s.index < s.filtered.length - 1){ s.next(); return true; } return false; };
    const prevI = () => { const s = IslamicSections; if(s.index > 0){ s.prev(); return true; } return false; };
    this.attach(body, nextI, prevI);
    this.attach(document.querySelector('#islamicReaderOverlay .islamic-reader-titlebar'), nextI, prevI);

    // الأذكار: الفئة التالية / السابقة
    const goCat = d => {
      const n = Adhkar.currentCat + d;
      if(n < 0 || n >= ADHKAR.length) return false;
      Adhkar.currentCat = n; Adhkar.renderCats(); Adhkar.renderList();
      const chip = document.querySelector('#adhkarCats .cat-chip.active');
      if(chip && chip.scrollIntoView) chip.scrollIntoView({ inline:'center', block:'nearest' });
      return true;
    };
    this.attach(document.getElementById('adhkarList'), () => goCat(1), () => goCat(-1));
  }
};
