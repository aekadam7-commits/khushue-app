const Setup = {
  init(){
    const saved = Store.get('device', null);
    if(saved){
      this.apply(saved);
      const screen = document.getElementById('setupScreen');
      if(screen) screen.classList.add('hidden');
      this.waitBoot();
    } else {
      const d = this.detect();
      document.querySelectorAll('.setup-choice').forEach(c=>{
        c.classList.toggle('selected', c.dataset.choice === d);
      });
    }
  },
  
  detect(){
    const ua = navigator.userAgent.toLowerCase();
    const w = window.innerWidth;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const tvK = ['tv','bravia','aft','googletv','appletv','smarttv','hbbtv','netcast','viera','pov_tv','crkey'];
    const isTV = tvK.some(k=>ua.includes(k)) || (w >= 1600 && !hasTouch);
    return isTV ? 'tv' : 'phone';
  },
  
  choose(d){
    Store.set('device', d);
    this.apply(d);
    
    const screen = document.getElementById('setupScreen');
    if(screen) screen.classList.add('hidden');
    
    this.waitBoot();
  },
  
  autoDetect(){
    const d = this.detect();
    document.querySelectorAll('.setup-choice').forEach(c=>{
      c.classList.toggle('selected', c.dataset.choice === d);
    });
    setTimeout(()=>this.choose(d), 400);
  },
  
  waitBoot(){
    let attempts = 0;
    const maxAttempts = 100;
    
    const tryStart = () => {
      attempts++;
      
      if(typeof Boot !== 'undefined' && Boot && Boot.start){
        try{ Boot.start(); } catch(e){}
        return;
      }
      
      if(attempts < maxAttempts){
        setTimeout(tryStart, 100);
      }
    };
    
    tryStart();
  },
  
  apply(d){
    document.body.setAttribute('data-device', d);
    
    const sidebar = document.getElementById('navSidebar');
    const bottomNav = document.getElementById('bottomNav');
    
    if(d === 'tv'){
      if(sidebar) sidebar.style.display = 'flex';
      if(bottomNav) bottomNav.style.display = 'none';
    } else {
      if(sidebar) sidebar.style.display = 'none';
      if(bottomNav) bottomNav.style.display = 'grid';
    }
    
    const lbl = document.getElementById('deviceSelectLabel');
    if(lbl){
      lbl.textContent = d === 'tv' ? '📺 تلفاز (ريموت)' : '📱 هاتف / تابلت';
    }
  },
  
  setDevice(d){
    if(!confirm('سيتم تغيير الواجهة وإعادة التحميل. متابعة؟')) return;
    Store.set('device', d);
    location.reload();
  },
  
  openDevicePicker(){
    const options = [
      { value:'phone', label:'📱 هاتف / تابلت' },
      { value:'tv', label:'📺 تلفاز (ريموت)' }
    ];
    const current = Store.get('device', 'phone');
    Focus.openSelector(options, current, (v)=>this.setDevice(v), 'نوع الواجهة');
  }
};
