/* ============================================================
   خُشوع — utils.js
   الدوال المشتركة (يجب أن يُحمَّل أولًا)
   ============================================================ */

// ============ Toast ============
function toast(m){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ============ Vibration ============
function vib(m){
  if(navigator.vibrate) navigator.vibrate(m);
}

// ============ Debounce ============
function debounce(fn, ms){
  ms = ms || 300;
  let t = 0;
  return function(){
    const args = arguments;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ============ Store (localStorage) ============
const Store = {
  get(k, d){
    try{
      const v = localStorage.getItem('khushu_' + k);
      return v ? JSON.parse(v) : d;
    } catch(e){ return d; }
  },
  set(k, v){
    try{
      localStorage.setItem('khushu_' + k, JSON.stringify(v));
    } catch(e){}
  },
  remove(k){
    try{
      localStorage.removeItem('khushu_' + k);
    } catch(e){}
  }
};

// ============ Capacitor Native ============
const CapacitorNative = {
  isNative(){
    try{
      return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    } catch(e){ return false; }
  },
  notif(){
    try{
      return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    } catch(e){ return null; }
  },
  geo(){
    try{
      return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation;
    } catch(e){ return null; }
  },
  foreground(){
    try{
      return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ForegroundService;
    } catch(e){ return null; }
  }
};

// ============ Hijri (مشترك) ============
const HMONTHS = [
  "محرم","صفر","ربيع الأول","ربيع الثاني",
  "جمادى الأولى","جمادى الآخرة","رجب","شعبان",
  "رمضان","شوال","ذو القعدة","ذو الحجة"
];

const GMONTHS = [
  "جانفي","فيفري","مارس","أفريل","ماي","جوان",
  "جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
];

const Hijri = {
  toHijri(date){
    try{
      const fmt = new Intl.DateTimeFormat(
        'en-u-ca-islamic-umalqura',
        { day:'numeric', month:'numeric', year:'numeric' }
      );
      const parts = fmt.formatToParts(date);
      const g = t => parseInt(parts.find(p => p.type === t).value, 10);
      return { day:g('day'), month:g('month'), year:g('year') };
    } catch(e){
      return { day:1, month:1, year:1447 };
    }
  },
  format(d){
    const h = this.toHijri(d);
    return h.day + ' ' + HMONTHS[h.month - 1] + ' ' + h.year + ' هـ';
  }
};

console.log('✅ utils.js loaded');
