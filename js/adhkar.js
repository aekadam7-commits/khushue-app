/* ============================================================
   خُشوع — adhkar.js
   الأذكار
   ============================================================ */

const Adhkar = {
  currentCat: 0,
  
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
      
      d.innerHTML = '<div class="dhikr-text">' + it.t + '</div>' +
                    '<div class="dhikr-count">📿 ' + ct + '</div>';
      
      box.appendChild(d);
    });
  }
};
