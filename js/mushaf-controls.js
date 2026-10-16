/* ============================================================
   خُشوع — mushaf-controls.js
   تحكم المصحف: الخط + القراءة الليلية + الأدوات
   ============================================================ */

const MushafControls = {
  init(){
    this.render();
    this.applySettings();
  },
  
  render(){
    const box = document.getElementById('mushafControls');
    if(!box) return;
    
    const fontSize = parseInt(Store.get('mushafFontSize', '26'), 10) || 26;
    const nightMode = Store.get('mushafNight', false) || false;
    
    box.innerHTML = 
      '<div class="mushaf-controls-group">' +
        '<button class="mushaf-control-btn" data-focus ' +
          'onclick="MushafControls.decreaseFont()" title="تصغير">−</button>' +
        '<div class="mushaf-font-slider">' +
          '<input type="range" min="18" max="42" step="2" ' +
            'value="' + fontSize + '" ' +
            'oninput="MushafControls.setFont(this.value)">' +
          '<span class="mushaf-font-value" id="mushafFontValue">' + fontSize + '</span>' +
        '</div>' +
        '<button class="mushaf-control-btn" data-focus ' +
          'onclick="MushafControls.increaseFont()" title="تكبير">+</button>' +
      '</div>' +
      '<div class="mushaf-controls-group">' +
        '<button class="mushaf-control-btn ' + (nightMode ? 'active' : '') + '" ' +
          'data-focus id="nightReadingBtn" ' +
          'onclick="MushafControls.toggleNight()" title="قراءة ليلية">' +
          '🌙 ليلي' +
        '</button>' +
        '<button class="mushaf-control-btn" data-focus ' +
          'onclick="Mushaf.enterFullscreen()" title="ملء الشاشة">' +
          '⛶ ملء الشاشة' +
        '</button>' +
      '</div>';
  },
  
  setFont(value){
    const size = parseInt(value, 10) || 26;
    Store.set('mushafFontSize', size);
    
    const textEl = document.querySelector('.mushaf-text');
    if(textEl) textEl.style.fontSize = size + 'px';
    
    const valEl = document.getElementById('mushafFontValue');
    if(valEl) valEl.textContent = size;
    
    // تحديث slider لو موجود
    const slider = document.querySelector('.mushaf-font-slider input');
    if(slider) slider.value = size;
  },
  
  increaseFont(){
    const current = parseInt(Store.get('mushafFontSize', '26'), 10) || 26;
    if(current < 42) this.setFont(current + 2);
  },
  
  decreaseFont(){
    const current = parseInt(Store.get('mushafFontSize', '26'), 10) || 26;
    if(current > 18) this.setFont(current - 2);
  },
  
  toggleNight(){
    const current = Store.get('mushafNight', false) || false;
    const next = !current;
    
    Store.set('mushafNight', next);
    document.body.classList.toggle('night-reading', next);
    
    const btn = document.getElementById('nightReadingBtn');
    if(btn) btn.classList.toggle('active', next);
    
    toast(next ? '🌙 القراءة الليلية مُفعَّلة' : '☀️ القراءة النهارية');
  },
  
  applySettings(){
    const fontSize = parseInt(Store.get('mushafFontSize', '26'), 10) || 26;
    const nightMode = Store.get('mushafNight', false) || false;
    
    document.documentElement.style.setProperty('--mushaf-fs', fontSize + 'px');
    
    if(nightMode){
      document.body.classList.add('night-reading');
    }
  }
};
