/* ============================================================
   خُشوع — ticker.js
   الشريط المتحرك (أحاديث + آيات + أدعية)
   ============================================================ */

const Ticker = {
  init(){
    const content = document.getElementById('tickerContent');
    if(!content) return;
    
    // بناء المحتوى مرتين للتدفق المستمر
    const html = TICKER_ITEMS.map(it =>
      '<span class="ticker-item">' +
        '<span class="t-ico">' + it.i + '</span>' +
        '<b>' + it.t + '</b>' +
        '<span class="t-src">— ' + it.s + '</span>' +
        '<span class="t-sep">✦</span>' +
      '</span>'
    ).join('');
    
    content.innerHTML = html + html;
    
    // ضبط المدة حسب طول النص
    setTimeout(() => {
      const len = content.scrollWidth / 2;
      const duration = Math.max(60, len / 40);
      content.style.animationDuration = duration + 's';
    }, 100);
  }
};
