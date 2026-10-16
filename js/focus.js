/* ============================================================
   خُشوع — focus.js
   نظام التركيز للريموت + القوائم المخصصة
   ============================================================ */

const Focus = {
  enabled: false,
  current: null,
  _listenerAdded: false,
  _audioCtx: null,
  
  init(){
    const d = Store.get('device', 'phone');
    
    if(d === 'tv'){
      this.enabled = true;
      document.body.classList.add('tv-mode');
      
      if(!this._listenerAdded){
        document.addEventListener('keydown', e => this.handle(e));
        this._listenerAdded = true;
      }
      
      setTimeout(() => this.reset(), 500);
      
      const observer = new MutationObserver(() => this.reset());
      document.querySelectorAll('.page').forEach(p => {
        observer.observe(p, { attributes:true, attributeFilter:['class'] });
      });
    }
  },
  
  click(){
    try{
      if(!this._audioCtx){
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const o = this._audioCtx.createOscillator();
      const g = this._audioCtx.createGain();
      o.frequency.value = 900;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(this._audioCtx.destination);
      o.start();
      setTimeout(() => { try{ o.stop(); }catch(e){} }, 50);
    } catch(e){}
  },
  
  getFocusables(){
    const qiblaFull = document.getElementById('qiblaFull');
    if(qiblaFull && !qiblaFull.classList.contains('hidden')){
      return [...qiblaFull.querySelectorAll('button,[data-focus]')]
        .filter(el => el.offsetParent !== null);
    }
    
    const adhanScreen = document.getElementById('adhanScreen');
    if(adhanScreen && !adhanScreen.classList.contains('hidden')){
      return [...adhanScreen.querySelectorAll('button,[data-focus]')]
        .filter(el => el.offsetParent !== null);
    }
    
    const duaScreen = document.getElementById('duaScreen');
    if(duaScreen && !duaScreen.classList.contains('hidden')){
      return [...duaScreen.querySelectorAll('button,[data-focus]')]
        .filter(el => el.offsetParent !== null);
    }
    
    const modal = document.getElementById('modal');
    if(modal && !modal.classList.contains('hidden')){
      return [...modal.querySelectorAll('button,[data-focus]')]
        .filter(el => el.offsetParent !== null);
    }
    
    const permScreen = document.getElementById('permissionsScreen');
    if(permScreen && !permScreen.classList.contains('hidden')){
      return [...permScreen.querySelectorAll('button,[data-focus]')]
        .filter(el => el.offsetParent !== null && !el.disabled);
    }
    
    const setupScreen = document.getElementById('setupScreen');
    if(setupScreen && setupScreen.offsetParent !== null){
      return [...setupScreen.querySelectorAll('button,[data-focus]')]
        .filter(el => el.offsetParent !== null && !el.disabled);
    }
    
    const activePage = document.querySelector('.page.active');
    if(!activePage) return [];
    
    const sbItems = document.querySelectorAll('.nav-sidebar .sb-item');
    const pageItems = activePage.querySelectorAll('[data-focus],button');
    
    return [...sbItems, ...pageItems]
      .filter(el => el.offsetParent !== null && !el.disabled);
  },
  
  reset(){
    setTimeout(() => {
      const list = this.getFocusables();
      if(list.length && (!this.current || !list.includes(this.current))){
        this.setFocus(list[0]);
      }
    }, 100);
  },
  
  setFocus(el){
    if(!el || this.current === el) return;
    if(this.current) this.current.classList.remove('focused');
    this.current = el;
    el.classList.add('focused');
    try{
      el.focus({ preventScroll:false });
      el.scrollIntoView({ behavior:'smooth', block:'nearest' });
    } catch(e){}
  },
  
  move(dir){
    const list = this.getFocusables();
    if(!list.length) return;
    
    if(!this.current || !list.includes(this.current)){
      this.setFocus(list[0]);
      this.click();
      return;
    }
    
    const cur = this.current.getBoundingClientRect();
    let best = null;
    let bestScore = Infinity;
    
    list.forEach(el => {
      if(el === this.current) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top + r.height/2;
      const cxc = cur.left + cur.width/2;
      const cyc = cur.top + cur.height/2;
      const dx = cx - cxc;
      const dy = cy - cyc;
      
      let valid = false;
      let dist = 0;
      
      if(dir === 'up' && dy < -3){ valid = true; dist = Math.abs(dy) + Math.abs(dx) * 0.5; }
      if(dir === 'down' && dy > 3){ valid = true; dist = Math.abs(dy) + Math.abs(dx) * 0.5; }
      if(dir === 'left' && dx < -3){ valid = true; dist = Math.abs(dx) + Math.abs(dy) * 0.5; }
      if(dir === 'right' && dx > 3){ valid = true; dist = Math.abs(dx) + Math.abs(dy) * 0.5; }
      
      if(valid && dist < bestScore){
        bestScore = dist;
        best = el;
      }
    });
    
    if(best){
      this.setFocus(best);
      this.click();
    }
  },
  
  handle(e){
    const k = e.key;
    const code = e.keyCode;
    
    if(k === 'Backspace' || k === 'Escape' || code === 27 || code === 8 || code === 461){
      e.preventDefault();
      
      const adhanScreen = document.getElementById('adhanScreen');
      if(adhanScreen && !adhanScreen.classList.contains('hidden')){
        try{ Adhan.continueFromScreen(); } catch(err){}
        return;
      }
      
      const duaScreen = document.getElementById('duaScreen');
      if(duaScreen && !duaScreen.classList.contains('hidden')){
        try{ Adhan.closeDuaScreen(); } catch(err){}
        return;
      }
      
      const modal = document.getElementById('modal');
      if(modal && !modal.classList.contains('hidden')){
        try{ App.closeModal(); } catch(err){}
        this.click();
        return;
      }
      
      const qiblaFull = document.getElementById('qiblaFull');
      if(qiblaFull && !qiblaFull.classList.contains('hidden')){
        try{ Qibla.closeFullScreen(); } catch(err){}
        this.click();
        return;
      }
      
      try{ App.go('home'); } catch(err){}
      this.click();
      return;
    }
    
    switch(k){
      case 'ArrowUp':
        e.preventDefault();
        this.move('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.move('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.move('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.move('right');
        break;
      case 'Enter':
      case ' ':
      case 'OK':
      case 'Select':
        if(this.current){
          e.preventDefault();
          this.click();
          this.current.click();
        }
        break;
      case 'MediaPlayPause':
      case 'MediaPlay':
      case 'MediaPause':
        e.preventDefault();
        try{
          if(typeof Quran !== 'undefined' && Quran.playing) Quran.playPause();
          else if(typeof QuranListen !== 'undefined' && QuranListen.playing) QuranListen.playPause();
        } catch(err){}
        break;
    }
  },
  
  openSelector(options, currentValue, onSelect, title){
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    if(!modal || !modalContent) return;
    
    let html = '<h3 style="font-family:\'Reem Kufi\',serif;color:var(--primary);margin-bottom:14px;text-align:center;font-size:20px">' + (title||'اختر') + '</h3>';
    
    options.forEach(opt => {
      const active = (opt.value === currentValue);
      const label = String(opt.label).replace(/</g,'&lt;');
      const value = String(opt.value).replace(/"/g,'&quot;');
      
      html += '<div class="reciter-option ' + (active?'active':'') + '" ' +
                    'data-focus ' +
                    'data-sel-value="' + value + '">' +
        '<span>' + label + '</span>' +
        (active ? '<span class="ro-ruwaya" style="color:var(--gold)">✓</span>' : '') +
      '</div>';
    });
    
    html += '<button class="btn-secondary" data-focus onclick="App.closeModal()" ' +
      'style="width:100%;margin-top:10px">إلغاء</button>';
    
    modalContent.innerHTML = html;
    modal.classList.remove('hidden');
    
    document.querySelectorAll('#modalContent [data-sel-value]').forEach(el => {
      el.addEventListener('click', () => {
        const val = el.getAttribute('data-sel-value');
        try{ App.closeModal(); } catch(err){}
        setTimeout(() => onSelect(val), 50);
      });
    });
    
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  }
};
