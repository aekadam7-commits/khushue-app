const Prayer = {
  coords: null,
  city: 'الجزائر العاصمة',
  country: 'الجزائر',
  
  init(){
    const saved = Store.get('cityData', null);
    if(saved){
      this.city = saved.city;
      this.country = saved.country;
      this.coords = { lat:saved.lat, lng:saved.lng };
    } else {
      this.coords = { lat:36.7538, lng:3.0588 };
    }
    
    this.renderMethodLabel();
    this.renderMadhabLabel();
    this.render();
    
    setInterval(() => this.render(), 30000);
    setTimeout(() => this.tryGPS(), 1500);
  },
  
  renderMethodLabel(){
    const saved = Store.get('prayerMethod', 'MuslimWorldLeague');
    const m = PRAYER_METHODS.find(x => x[0] === saved);
    const lbl = document.getElementById('prayerMethodLabel');
    if(lbl && m) lbl.textContent = m[1];
  },
  
  renderMadhabLabel(){
    const saved = Store.get('prayerMadhab', 'shafi');
    const lbl = document.getElementById('prayerMadhabLabel');
    if(lbl) lbl.textContent = saved === 'hanafi' ? 'الحنفي' : 'الشافعي / المالكي / الحنبلي';
  },
  
  openMethodPicker(){
    const options = PRAYER_METHODS.map(m => ({ value:m[0], label:m[1] }));
    const current = Store.get('prayerMethod', 'MuslimWorldLeague');
    
    Focus.openSelector(options, current, (v) => {
      Store.set('prayerMethod', v);
      this.renderMethodLabel();
      this.render();
      if(typeof Adhan !== 'undefined') Adhan.scheduleToday(true);
      
      const m = PRAYER_METHODS.find(x => x[0] === v);
      toast('✅ ' + (m ? m[1] : v));
    }, 'طريقة الحساب');
  },
  
  openMadhabPicker(){
    const options = [
      { value:'shafi', label:'الشافعي / المالكي / الحنبلي' },
      { value:'hanafi', label:'الحنفي' }
    ];
    const current = Store.get('prayerMadhab', 'shafi');
    
    Focus.openSelector(options, current, (v) => {
      Store.set('prayerMadhab', v);
      this.renderMadhabLabel();
      this.render();
      if(typeof Adhan !== 'undefined') Adhan.scheduleToday(true);
      toast('✅ ' + (v === 'hanafi' ? 'الحنفي' : 'الشافعي'));
    }, 'مذهب العصر');
  },
  
  async setLocationFromGPS(lat, lng){
    this.coords = { lat:lat, lng:lng };
    this.city = 'موقعي';
    this.country = 'جاري التحديد...';
    
    Store.set('cityData', {
      city:'موقعي',
      country:'GPS',
      lat:lat,
      lng:lng,
      source:'gps'
    });
    
    this.render();
    
    if(typeof Qibla !== 'undefined') Qibla.compute(lat, lng);
    if(typeof Adhan !== 'undefined') Adhan.scheduleToday(true);
    
    // تحديد اسم أقرب مدينة محلياً (دون إنترنت)
    const near = this.nearestCity(lat, lng, 60);
    if(near){
      this.city = near[0];
      this.country = near[1];
      Store.set('cityData', {
        city:near[0],
        country:near[1],
        lat:lat,
        lng:lng,
        source:'gps'
      });
    } else {
      this.country = 'GPS';
    }
    
    this.render();
  },
  
  nearestCity(lat, lng, maxKm){
    if(typeof CITIES === 'undefined') return null;
    const rad = Math.PI / 180;
    let best = null;
    let bestD = Infinity;
    
    CITIES.forEach(c => {
      const dLat = (c[2] - lat) * rad;
      const dLng = (c[3] - lng) * rad;
      const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * rad) * Math.cos(c[2] * rad) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const d = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      if(d < bestD){ bestD = d; best = c; }
    });
    
    return best && bestD <= maxKm ? best : null;
  },
  
  tryGPS(){
    if(Store.get('cityData', null)) return;
    
    if(CapacitorNative.isNative() && CapacitorNative.geo()){
      CapacitorNative.geo()
        .getCurrentPosition({ enableHighAccuracy:false, timeout:8000 })
        .then(pos => {
          this.setLocationFromGPS(pos.coords.latitude, pos.coords.longitude);
        })
        .catch(()=>{});
      return;
    }
    
    if(!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      pos => this.setLocationFromGPS(pos.coords.latitude, pos.coords.longitude),
      ()=>{},
      { enableHighAccuracy:false, timeout:8000 }
    );
  },
  
  locate(){
    if(CapacitorNative.isNative() && CapacitorNative.geo()){
      toast('📍 جارٍ التحديد...');
      CapacitorNative.geo()
        .getCurrentPosition({ enableHighAccuracy:true, timeout:10000 })
        .then(pos => {
          this.setLocationFromGPS(pos.coords.latitude, pos.coords.longitude)
            .then(() => toast('✅ ' + this.city + '، ' + this.country));
        })
        .catch(() => toast('❌ فشل التحديد'));
      return;
    }
    
    if(!navigator.geolocation){
      toast('❌ GPS غير مدعوم');
      return;
    }
    
    toast('📍 جارٍ التحديد...');
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.setLocationFromGPS(pos.coords.latitude, pos.coords.longitude)
          .then(() => toast('✅ ' + this.city + '، ' + this.country));
      },
      () => toast('❌ فشل'),
      { enableHighAccuracy:true, timeout:10000 }
    );
  },
  
  openCityPicker(){
    let html = '<h3>🏙️ اختر مدينتك</h3>' +
      '<input type="text" class="city-search" placeholder="ابحث..." ' +
      'oninput="Prayer.filterCities(this.value)">' +
      '<button class="btn-primary" style="margin-bottom:12px" data-focus ' +
      'onclick="Prayer.locate();App.closeModal()">📡 تحديد موقعي (GPS)</button>' +
      '<div class="city-list">';
    
    CITIES.forEach((c, i) => {
      const active = (c[0] === this.city);
      html += '<div class="city-item ' + (active?'active':'') + '" ' +
        'data-focus data-name="' + c[0] + '" data-country="' + c[1] + '" ' +
        'onclick="Prayer.pickCity(' + i + ')">' +
        '<span>' + c[0] + '</span>' +
        '<span class="country">' + c[1] + '</span>' +
        '</div>';
    });
    
    html += '</div>';
    
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  },
  
  filterCities(q){
    const t = q.trim();
    document.querySelectorAll('.city-item').forEach(el => {
      el.style.display = (el.dataset.name.includes(t) || el.dataset.country.includes(t)) ? 'flex' : 'none';
    });
  },
  
  pickCity(i){
    const c = CITIES[i];
    this.city = c[0];
    this.country = c[1];
    this.coords = { lat:c[2], lng:c[3] };
    
    Store.set('cityData', {
      city:this.city,
      country:this.country,
      lat:c[2],
      lng:c[3],
      source:'city'
    });
    
    this.render();
    if(typeof Qibla !== 'undefined') Qibla.compute(c[2], c[3]);
    if(typeof Adhan !== 'undefined') Adhan.scheduleToday(true);
    
    App.closeModal();
    toast('✅ ' + c[0]);
  },
  
  compute(){
    if(typeof adhan === 'undefined' || !adhan.PrayerTimes){
      throw new Error('no adhan');
    }
    
    const c = new adhan.Coordinates(this.coords.lat, this.coords.lng);
    const method = Store.get('prayerMethod', 'MuslimWorldLeague');
    const factory = adhan.CalculationMethod[method] || adhan.CalculationMethod.MuslimWorldLeague;
    const params = factory();
    params.madhab = Store.get('prayerMadhab', 'shafi') === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
    
    return new adhan.PrayerTimes(c, new Date(), params);
  },
  
  fmt(d){
    if(!d) return '—';
    const h = d.getHours();
    const m = d.getMinutes();
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  },
  
  render(){
    if(!this.coords) return;
    
    const locEl = document.getElementById('prayerLoc');
    if(locEl) locEl.textContent = this.city + '، ' + this.country;
    
    if(typeof adhan === 'undefined' || !adhan.PrayerTimes){
      const pl = document.getElementById('prayerList');
      if(pl) pl.innerHTML = '<div style="text-align:center;padding:20px;color:#c62828">⚠️ مكتبة المواقيت لم تُحمَّل</div>';
      return;
    }
    
    let p;
    try{ p = this.compute(); } catch(e){ return; }
    
    const list = [
      ['الفجر', p.fajr, '🌙'],
      ['الشروق', p.sunrise, '🌅'],
      ['الظهر', p.dhuhr, '☀️'],
      ['العصر', p.asr, '🌤️'],
      ['المغرب', p.maghrib, '🌆'],
      ['العشاء', p.isha, '🌙']
    ];
    
    const pl = document.getElementById('prayerList');
    if(!pl) return;
    pl.innerHTML = '';
    
    const now = new Date();
    let activeIdx = -1;
    [0,2,3,4,5].forEach(i => { if(list[i][1] <= now) activeIdx = i; });
    
    list.forEach((pp, i) => {
      const d = document.createElement('div');
      d.className = 'prayer-row' + (i === activeIdx ? ' active' : '');
      d.setAttribute('data-focus', '');
      d.innerHTML = '<div class="prayer-name">' + pp[2] + ' ' + pp[0] + '</div>' +
                    '<div class="prayer-time">' + this.fmt(pp[1]) + '</div>';
      pl.appendChild(d);
    });
    
    const prayers = [
      { name:'الفجر', time:p.fajr },
      { name:'الظهر', time:p.dhuhr },
      { name:'العصر', time:p.asr },
      { name:'المغرب', time:p.maghrib },
      { name:'العشاء', time:p.isha }
    ];
    
    let next = null;
    for(const pr of prayers){
      if(pr.time > now){ next = pr; break; }
    }
    
    if(!next){
      try{
        const tm = new Date(Date.now() + 86400000);
        const c = new adhan.Coordinates(this.coords.lat, this.coords.lng);
        const method = Store.get('prayerMethod', 'MuslimWorldLeague');
        const factory = adhan.CalculationMethod[method] || adhan.CalculationMethod.MuslimWorldLeague;
        const params = factory();
        params.madhab = Store.get('prayerMadhab', 'shafi') === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
        const pt2 = new adhan.PrayerTimes(c, tm, params);
        next = { name:'الفجر', time:pt2.fajr };
      } catch(e){
        next = { name:'الفجر', time:now };
      }
    }
    
    const npName = document.getElementById('nextPrayerName');
    if(npName) npName.textContent = next.name;
    
    this.tick(next.time);
    
    const row = document.getElementById('prayerTimesRow');
    if(row){
      row.innerHTML = '';
      prayers.forEach(pr => {
        const isA = next && pr.name === next.name;
        row.innerHTML += '<div class="np-time ' + (isA?'active':'') + '">' +
          '<b>' + pr.name + '</b>' + this.fmt(pr.time) + '</div>';
      });
    }
  },
  
  tick(target){
    const el = document.getElementById('nextPrayerCountdown');
    if(!el) return;
    
    const upd = () => {
      const diff = target - new Date();
      if(diff <= 0){
        clearInterval(this._t);
        this.render();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = String(h).padStart(2,'0') + ':' + 
                       String(m).padStart(2,'0') + ':' + 
                       String(s).padStart(2,'0');
    };
    
    clearInterval(this._t);
    upd();
    this._t = setInterval(upd, 1000);
  }
};
