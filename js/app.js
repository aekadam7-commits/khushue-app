const Boot = {
  start(){
    const splash = document.getElementById('splash');
    if(splash) splash.classList.remove('hidden');
    
    setTimeout(() => {
      Promise.resolve(window.__adhanReady).then(() => {
        if(splash) splash.classList.add('fade');
        
        const permDone = Store.get('permissionsDone', false);
        
        if(permDone){
          const app = document.getElementById('app');
          if(app) app.classList.remove('hidden');
          App.init();
        } else {
          const ps = document.getElementById('permissionsScreen');
          if(ps) ps.classList.remove('hidden');
          
          if(Store.get('device', 'phone') === 'tv'){
            Focus.enabled = true;
            if(!Focus._listenerAdded){
              document.addEventListener('keydown', e => Focus.handle(e));
              Focus._listenerAdded = true;
            }
            setTimeout(() => {
              Focus.current = null;
              const list = Focus.getFocusables();
              if(list.length) Focus.setFocus(list[0]);
            }, 300);
          }
        }
      });
    }, 2000);
  }
};

const App = {
  currentPage: 'home',
  
  init(){
    try{
      const theme = Store.get('theme', 'light');
      document.documentElement.setAttribute('data-theme', theme);
      
      const sd = document.getElementById('setDark');
      if(sd) sd.checked = theme === 'dark';
      
      const sf = document.getElementById('setQuranFont');
      if(sf) sf.value = Store.get('quranFont', 28);
      
      document.documentElement.style.setProperty('--quran-fs', Store.get('quranFont', 28) + 'px');
      
      this.updateDates();
      setInterval(() => this.updateDates(), 60000);
      this.renderHome();
    } catch(e){}
    
    try{ Quran.init(); } catch(e){}
    try{ QuranListen.init(); } catch(e){}
    try{ Mushaf.init(); } catch(e){}
    try{ MushafControls.init(); } catch(e){}
    try{ Prayer.init(); } catch(e){}
    try{ Qibla.init(); } catch(e){}
    try{ Tasbih.init(); } catch(e){}
    try{ Names99.init(); } catch(e){}
    try{ Calendar.init(); } catch(e){}
    try{ Ticker.init(); } catch(e){}
    try{ Notifier.init(); } catch(e){}
    try{ Adhan.init(); } catch(e){}
    try{ SleepTimer.init(); } catch(e){}
    try{ IslamicNotifications.init(); } catch(e){}
    try{ Focus.init(); } catch(e){}
    
    this.go('home');
  },
  
  updateDates(){
    const n = new Date();
    try{
      const hd = document.getElementById('hijriDate');
      if(hd) hd.textContent = Hijri.format(n);
    } catch(e){}
    
    const gd = document.getElementById('gregDate');
    if(gd){
      gd.textContent = n.getDate() + ' ' + GMONTHS[n.getMonth()] + ' ' + n.getFullYear();
    }
  },
  
  go(page){
    this.currentPage = page;
    
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.dataset.page === page);
    });
    
    document.querySelectorAll('.bottom-nav button').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === page);
    });
    
    document.querySelectorAll('.nav-sidebar .sb-item').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === page);
    });
    
    if(page === 'calendar'){
      try{ Calendar.render(); } catch(e){}
    }
    
    if(page === 'adhkar'){ try{ Adhkar.renderAll(); } catch(e){} }
    if(page === 'library' || page === 'seerah'){ try{ IslamicLibrary.init(); } catch(e){} }
    if(page === 'history-today'){ try{ TodayHistory.init(); } catch(e){} }
    if(page === 'mushaf'){ setTimeout(() => { try{ Mushaf.openMenu(); }catch(e){} }, 200); }
    if(page === 'settings'){ setTimeout(() => { try{ Adhan.updatePrayerTimesInSettings(); }catch(e){} }, 200); }
    
    window.scrollTo({ top:0, behavior:'smooth' });
    
    if(Focus.enabled){
      setTimeout(() => {
        Focus.current = null;
        Focus.reset();
      }, 300);
    }
  },
  
  toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', next);
    Store.set('theme', next);
    
    const sd = document.getElementById('setDark');
    if(sd) sd.checked = next === 'dark';
  },
  
  closeModal(){
    const modal = document.getElementById('modal');
    if(modal) modal.classList.add('hidden');
    
    if(Focus.enabled){
      setTimeout(() => {
        Focus.current = null;
        Focus.reset();
      }, 200);
    }
  },
  
  renderHome(){
    const ayahs = [
      { t:"﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾", r:"الشرح: 6" },
      { t:"﴿ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴾", r:"الطلاق: 3" },
      { t:"﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾", r:"الرعد: 28" },
      { t:"﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾", r:"طه: 114" },
      { t:"﴿ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴾", r:"البقرة: 153" },
      { t:"﴿ فَاذْكُرُونِي أَذْكُرْكُمْ ﴾", r:"البقرة: 152" },
      { t:"﴿ وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ﴾", r:"الحديد: 4" }
    ];
    
    const a = ayahs[new Date().getDate() % ayahs.length];
    
    const aodText = document.getElementById('aodText');
    const aodRef = document.getElementById('aodRef');
    
    if(aodText) aodText.textContent = a.t;
    if(aodRef) aodRef.textContent = a.r;
  }
};

const Permissions = {
  async requestNotif(){
    if(CapacitorNative.isNative() && CapacitorNative.notif()){
      try{
        const LN = CapacitorNative.notif();
        const r = await LN.requestPermissions();
        const ok = r.display === 'granted';
        this.updateUI('permNotif', ok);
        if(typeof Notifier !== 'undefined') Notifier.updateBadge();
        toast(ok ? '✅ تم تفعيل الإشعارات' : '❌ لم يتم منح الإذن');
        return;
      } catch(e){}
    }
    try{
      const r = await Notification.requestPermission();
      this.updateUI('permNotif', r === 'granted');
      if(typeof Notifier !== 'undefined') Notifier.updateBadge();
      toast(r === 'granted' ? '✅ تم' : '❌ لم يُمنح');
    } catch(e){}
  },
  
  async requestLoc(){
    toast('📍 جارٍ تحديد موقعك...');
    if(CapacitorNative.isNative() && CapacitorNative.geo()){
      try{
        const Geo = CapacitorNative.geo();
        const perm = await Geo.requestPermissions();
        const granted = (perm.location === 'granted') || (perm.coarseLocation === 'granted');
        if(!granted){
          toast('❌ لم يُمنح إذن الموقع');
          this.updateUI('permLoc', false);
          return;
        }
        const pos = await Geo.getCurrentPosition({ enableHighAccuracy:true, timeout:15000 });
        await Prayer.setLocationFromGPS(pos.coords.latitude, pos.coords.longitude);
        this.updateUI('permLoc', true);
        toast('✅ ' + Prayer.city + '، ' + Prayer.country);
        return;
      } catch(e){
        toast('❌ فشل الموقع');
        this.updateUI('permLoc', false);
        return;
      }
    }
    if(!navigator.geolocation){
      toast('GPS غير مدعوم');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        await Prayer.setLocationFromGPS(pos.coords.latitude, pos.coords.longitude);
        this.updateUI('permLoc', true);
        toast('✅ ' + Prayer.city + '، ' + Prayer.country);
      },
      () => {
        toast('❌ فشل');
        this.updateUI('permLoc', false);
      },
      { enableHighAccuracy:true, timeout:15000 }
    );
  },
  
  updateUI(id, ok){
    const el = document.getElementById(id);
    if(!el) return;
    const btn = el.querySelector('.perm-btn');
    if(btn){
      btn.textContent = ok ? '✅ تم' : 'تفعيل';
      btn.classList.toggle('perm-done', ok);
    }
  },
  
  skip(){
    Store.set('permissionsDone', true);
    const screen = document.getElementById('permissionsScreen');
    if(screen) screen.classList.add('hidden');
    const app = document.getElementById('app');
    if(app) app.classList.remove('hidden');
    App.init();
  }
};

const Settings = {
  setDark(v){
    const t = v ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    Store.set('theme', t);
  },
  setQuranFont(v){
    const size = parseInt(v, 10);
    Store.set('quranFont', size);
    document.documentElement.style.setProperty('--quran-fs', size + 'px');
  }
};

window.addEventListener('DOMContentLoaded', () => { Setup.init(); });

window.addEventListener('deviceready', () => {
  try{
    Notifier.init();
    if(typeof Adhan !== 'undefined') Adhan.scheduleToday(true);
  } catch(e){}
}, { once:true });

window.addEventListener('resume', () => {
  try{
    if(typeof Adhan !== 'undefined') Adhan.scheduleToday(true);
  } catch(e){}
});

document.addEventListener('click', (e) => {
  const modal = document.getElementById('modal');
  if(modal && e.target === modal){ App.closeModal(); }
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    const modal = document.getElementById('modal');
    if(modal && !modal.classList.contains('hidden')){ App.closeModal(); }
  }
});
