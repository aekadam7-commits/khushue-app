/* ============================================================
   خُشوع — adhkar.js
   الأذكار
   ============================================================ */

const Adhkar = {
  currentCat: 0,
  counts: {},
  
  renderAll(){
    this.renderCats();
    this.renderList();
  },
  
  renderCats(){
    const box = document.getElementById('adhkarCats');
    if(!box) return;
    box.innerHTML = '';
    
    ADHKAR.forEach((c, i) => {
      const chip = document.createElement('div');
      chip.className = 'cat-chip' + (i === this.currentCat ? ' active' : '');
      chip.setAttribute('data-focus', '');
      chip.textContent = c.cat;
      
      chip.onclick = () => {
        Adhkar.currentCat = i;
        Adhkar.renderCats();
        Adhkar.renderList();
        if(Focus.enabled) setTimeout(() => {
          Focus.current = null;
          Focus.reset();
        }, 100);
      };
      
      box.appendChild(chip);
    });
  },
  
  renderList(){
    const box = document.getElementById('adhkarList');
    if(!box) return;
    box.innerHTML = '';
    
    const cat = ADHKAR[this.currentCat];
    if(!cat || !cat.items) return;
    
    cat.items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'dhikr-card';
      d.setAttribute('data-focus', '');
      
      const ct = it.c === 1 ? 'مرة واحدة'
                : (it.c === 2 ? 'مرتان' : it.c + ' مرة');
      
      const key = this.currentCat + ':' + cat.items.indexOf(it);
      const done = this.counts[key] || 0;
      d.innerHTML = '<div class="dhikr-text">' + it.t + '</div>' +
                    '<div class="dhikr-count">📿 الهدف: ' + ct + '</div>' +
                    '<button class="dhikr-tap" data-focus aria-label="تسجيل تكرار الذكر">' + done + ' / ' + it.c + '  · اضغط للتسبيح</button>' +
                    '<button class="dhikr-reset" data-focus aria-label="إعادة عداد الذكر">إعادة</button>';
      const tap = d.querySelector('.dhikr-tap');
      tap.onclick = (ev) => { ev.stopPropagation(); const next = Math.min(it.c, (this.counts[key] || 0) + 1); this.counts[key] = next; tap.textContent = next + ' / ' + it.c + (next >= it.c ? ' ✓ اكتمل' : ' · اضغط للتسبيح'); if(next >= it.c) toast('أحسنت، اكتمل الذكر'); };
      d.querySelector('.dhikr-reset').onclick = (ev) => { ev.stopPropagation(); this.counts[key] = 0; tap.textContent = '0 / ' + it.c + ' · اضغط للتسبيح'; };
      
      box.appendChild(d);
    });
  }
};
