const Qibla = {
  qiblaDir: 0,
  currentHeading: 0,
  smoothed: null,
  lastUpdate: 0,
  enabled: false,
  _fullscreen: false,
  _lastVib: 0,
  _aligned: false,
  _handler: null,
  
  init(){
    const s = Store.get('cityData', null);
    if(s) this.compute(s.lat, s.lng);
    else this.compute(36.7538, 3.0588);
  },
  
  compute(lat, lng){
    const kLat = 21.4225;
    const kLng = 39.8262;
    
    const f1 = lat * Math.PI / 180;
    const f2 = kLat * Math.PI / 180;
    const dl = (kLng - lng) * Math.PI / 180;
    
    const x = Math.sin(dl) * Math.cos(f2);
    const y = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    
    this.qiblaDir = (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
    
    const el = document.getElementById('qiblaDeg');
    if(el) el.textContent = Math.round(this.qiblaDir) + '°';
    
    const fe = document.getElementById('qiblaFullDeg');
    if(fe) fe.textContent = Math.round(this.qiblaDir) + '°';
  },
  
  openFullScreen(){
    const el = document.getElementById('qiblaFull');
    if(!el) return;
    
    el.classList.remove('hidden');
    this._fullscreen = true;
    
    const city = Store.get('cityData', null);
    const cityEl = document.getElementById('qiblaFullCity');
    if(cityEl) cityEl.textContent = city ? city.city + '، ' + city.country : '—';
    
    if(!this.enabled) this.enable();
    this._updateFull();
    
    if(Focus.enabled) setTimeout(() => {
      Focus.current = null;
      const b = document.querySelector('#qiblaFull .qibla-full-close');
      if(b) Focus.setFocus(b);
    }, 300);
  },
  
  closeFullScreen(){
    const el = document.getElementById('qiblaFull');
    if(!el) return;
    el.classList.add('hidden');
    this._fullscreen = false;
    if(Focus.enabled) setTimeout(() => Focus.reset(), 200);
  },
  
  _updateFull(){
    if(!this._fullscreen) return;
    
    const status = document.getElementById('qiblaFullStatus');
    if(!status) return;
    
    const diff = (this.qiblaDir - this.currentHeading + 540) % 360 - 180;
    const abs = Math.abs(diff);
    
    if(abs < 5){
      status.textContent = '✅ أنت متجه نحو القبلة';
      status.className = 'qibla-full-status aligned';
      
      if(!this._aligned && Date.now() - this._lastVib > 1500){
        this._lastVib = Date.now();
        this._aligned = true;
        if(navigator.vibrate) navigator.vibrate([80, 40, 80]);
      }
    } else {
      status.textContent = 'متبقٍ ' + Math.round(abs) + '° ' + (diff > 0 ? 'يمينًا' : 'يسارًا');
      status.className = 'qibla-full-status';
      this._aligned = false;
    }
  },
  
  enable(){
    if(Store.get('device', 'phone') === 'tv') return;
    if(this.enabled) return;
    
    this.smoothed = null;
    this.lastUpdate = 0;
    
    const self = this;
    
    const accelHandler = (e) => {
      if(e.accelerationIncludingGravity){
        self._accel = e.accelerationIncludingGravity;
      }
    };
    
    const orientHandler = (e) => {
      let heading = null;
      let absolute = false;
      
      if(typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)){
        heading = e.webkitCompassHeading;
        absolute = true;
      } else if(e.absolute === true && typeof e.alpha === 'number' && !isNaN(e.alpha)){
        heading = (360 - e.alpha) % 360;
        absolute = true;
      } else if(typeof e.alpha === 'number' && !isNaN(e.alpha)){
        heading = (360 - e.alpha) % 360;
      }
      
      if(heading === null) return;
      
      if(!absolute){
        let sa = 0;
        if(screen.orientation && typeof screen.orientation.angle === 'number'){
          sa = screen.orientation.angle;
        } else if(typeof window.orientation === 'number'){
          sa = window.orientation;
        }
        heading = (heading + sa + 360) % 360;
      }
      
      self.currentHeading = heading;
      self.update();
    };
    
    const attach = () => {
      window.addEventListener('devicemotion', accelHandler, true);
      window.addEventListener('deviceorientation', orientHandler, true);
      
      if('ondeviceorientationabsolute' in window){
        window.addEventListener('deviceorientationabsolute', orientHandler, true);
      }
      
      this.enabled = true;
      
      const ac = document.getElementById('qiblaAccuracy');
      if(ac){
        ac.classList.remove('hidden');
        ac.textContent = 'دقة: جيدة';
      }
    };
    
    if(typeof DeviceOrientationEvent === 'undefined'){
      return;
    }
    
    if(typeof DeviceOrientationEvent.requestPermission === 'function'){
      DeviceOrientationEvent.requestPermission()
        .then(v => { if(v === 'granted') attach(); })
        .catch(()=>{});
    } else {
      attach();
    }
  },
  
  update(){
    const now = Date.now();
    if(now - this.lastUpdate < 50) return;
    this.lastUpdate = now;
    
    const nh = this.currentHeading;
    
    if(this.smoothed === null){
      this.smoothed = nh;
    } else {
      let d = nh - this.smoothed;
      if(d > 180) d -= 360;
      if(d < -180) d += 360;
      this.smoothed = (this.smoothed + d * 0.15 + 360) % 360;
    }
    
    const h = this.smoothed;
    const diff = (this.qiblaDir - h + 540) % 360 - 180;
    
    const hd = document.getElementById('headingDeg');
    if(hd) hd.textContent = Math.round(h) + '°';
    
    const qd = document.getElementById('qiblaDiff');
    if(qd) qd.textContent = Math.round(diff) + '°';
    
    const ring = document.getElementById('compassRing');
    if(ring) ring.style.transform = 'rotate(' + (-h) + 'deg)';
    
    const needle = document.getElementById('compassNeedle');
    if(needle) needle.style.transform = 'rotate(' + this.qiblaDir + 'deg)';
    
    if(this._fullscreen){
      const r = document.getElementById('qiblaFullRing');
      if(r) r.style.transform = 'rotate(' + (-h) + 'deg)';
      
      const n = document.getElementById('qiblaFullNeedle');
      if(n) n.style.transform = 'rotate(' + this.qiblaDir + 'deg)';
      
      this._updateFull();
    }
    
    const abs = Math.abs(diff);
    if(abs < 5 && !this._fullscreen){
      const ring2 = document.getElementById('compassRing');
      if(ring2 && !ring2.classList.contains('qibla-aligned')){
        ring2.classList.add('qibla-aligned');
        if(Date.now() - this._lastVib > 2000){
          this._lastVib = Date.now();
          if(navigator.vibrate) navigator.vibrate([60, 30, 60]);
        }
      }
    } else {
      const ring2 = document.getElementById('compassRing');
      if(ring2) ring2.classList.remove('qibla-aligned');
    }
  }
};
