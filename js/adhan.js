const Adhan = {
  audio: null,
  duaAudio: null,
  enabled: true,
  adhanSound: 'adhan1',
  volume: 80,
  preMinute: 0,
  prayerModes: { fajr:'full', dhuhr:'full', asr:'full', maghrib:'full', isha:'full' },
  playedToday: {},
  timer: null,
  lastScheduleKey: '',
  scheduleDays: 14,
  
  init(){
    this.audio = document.getElementById('adhanAudio') || new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => {
      this.updateTestBtn();
      this.showDuaScreen();
    });
    this.audio.addEventListener('pause', () => this.updateTestBtn());
    
    this.duaAudio = document.getElementById('duaAudio') || new Audio();
    this.duaAudio.preload = 'auto';
    
    this.enabled = Store.get('adhanEnabled', true);
    this.adhanSound = Store.get('adhanSound', 'adhan1');
    this.volume = parseInt(Store.get('adhanVolume', '80'), 10) || 80;
    this.preMinute = parseInt(Store.get('preAdhanMin', '0'), 10) || 0;
    
    const savedModes = Store.get('prayerModes', null);
    if(savedModes && typeof savedModes === 'object'){
      this.prayerModes = Object.assign(
        { fajr:'full', dhuhr:'full', asr:'full', maghrib:'full', isha:'full' },
        savedModes
      );
    }
    
    this.audio.volume = this.volume / 100;
    this.duaAudio.volume = this.volume / 100;
    
    this.renderToggle();
    this.renderVolume();
    this.renderSoundChoices();
    this.renderPerPrayer();
    this.renderPreMinuteLabel();
    
    const ev = document.getElementById('eventsNotif');
    if(ev) ev.checked = Notifier.isEventsEnabled();
    
    this.check();
    this.scheduleToday(true);
    this.timer = setInterval(() => this.check(), 10000);
    
    this.setupNotificationListeners();
  },
  
  setupNotificationListeners(){
    if(CapacitorNative.isNative() && CapacitorNative.notif()){
      try{
        const LN = CapacitorNative.notif();
        LN.addListener('localNotificationActionPerformed', (data) => {
          const extra = (data.notification && data.notification.extra) || {};
          if(extra.type === 'adhan'){
            this.showAdhanScreen(extra.prayer || 'الصلاة', extra.isFajr || false);
          } else if(extra.type === 'dua'){
            this.showDuaScreen();
          }
        });
      } catch(e){}
    }
    
    if(this.isCordova()){
      try{
        window.cordova.plugins.notification.local.on('click', (n) => {
          if(n.data && n.data.type === 'adhan'){
            this.showAdhanScreen(n.data.prayer || 'الصلاة', n.data.isFajr || false);
          } else if(n.data && n.data.type === 'dua'){
            this.showDuaScreen();
          }
        });
      } catch(e){}
    }
  },
  
  isCordova(){ return Notifier.isCordova(); },
  
  showAdhanScreen(prayer, isFajr){
    const screen = document.getElementById('adhanScreen');
    if(!screen) return;
    
    const nameEl = document.getElementById('adhanScreenPrayer');
    const timeEl = document.getElementById('adhanScreenTime');
    const fajrLine = document.getElementById('adhanFajrLine');
    
    if(nameEl) nameEl.textContent = 'حان وقت صلاة ' + prayer;
    if(timeEl){
      timeEl.textContent = new Date().toLocaleTimeString('ar-DZ', {
        hour:'2-digit', minute:'2-digit', hour12:false
      });
    }
    if(fajrLine) fajrLine.classList.toggle('hidden', !isFajr);
    
    screen.classList.remove('hidden');
    
    if(Focus.enabled) setTimeout(() => {
      Focus.current = null;
      const first = document.getElementById('btnAdhanContinue');
      if(first) Focus.setFocus(first);
    }, 100);
  },
  
  continueFromScreen(){
    const screen = document.getElementById('adhanScreen');
    if(screen) screen.classList.add('hidden');
    toast('🔊 الأذان مستمر');
    if(Focus.enabled) setTimeout(() => Focus.reset(), 200);
  },
  
  stopFromScreen(){
    try{
      this.audio.pause();
      this.audio.currentTime = 0;
      this.duaAudio.pause();
      this.duaAudio.currentTime = 0;
    } catch(e){}
    
    const screen = document.getElementById('adhanScreen');
    if(screen) screen.classList.add('hidden');
    
    toast('⏹ تم إيقاف الأذان');
    try{ App.go('home'); } catch(e){}
    
    if(Focus.enabled) setTimeout(() => Focus.reset(), 300);
  },
  
  showDuaScreen(){
    const screen = document.getElementById('duaScreen');
    if(!screen) return;
    screen.classList.remove('hidden');
    this.playDua();
    
    if(Focus.enabled) setTimeout(() => {
      Focus.current = null;
      const first = document.getElementById('btnDuaListen');
      if(first) Focus.setFocus(first);
    }, 100);
  },
  
  playDua(){
    try{
      const url = this.getSoundUrl('dua_adhan');
      this.duaAudio.src = url;
      this.duaAudio.currentTime = 0;
      this.duaAudio.volume = this.volume / 100;
      
      this.duaAudio.play().then(() => {
        const btn = document.getElementById('btnDuaListen');
        if(btn) btn.textContent = '⏸ إيقاف';
      }).catch(()=>{});
    } catch(e){}
  },
  
  toggleDuaAudio(){
    if(this.duaAudio && !this.duaAudio.paused){
      this.duaAudio.pause();
      const btn = document.getElementById('btnDuaListen');
      if(btn) btn.textContent = '🔊 استماع';
    } else {
      this.playDua();
    }
  },
  
  closeDuaScreen(){
    try{
      this.duaAudio.pause();
      this.duaAudio.currentTime = 0;
    } catch(e){}
    
    const screen = document.getElementById('duaScreen');
    if(screen) screen.classList.add('hidden');
    
    try{ App.go('home'); } catch(e){}
    if(Focus.enabled) setTimeout(() => Focus.reset(), 300);
  },
  
  renderToggle(){
    const btn = document.getElementById('adhanToggleBtn');
    const icon = document.getElementById('adhanToggleIcon');
    const status = document.getElementById('adhanToggleStatus');
    if(!btn) return;
    
    if(this.enabled){
      btn.classList.remove('off');
      btn.classList.add('on');
      if(icon) icon.textContent = '🔔';
      if(status) status.textContent = 'مفعّل ✅';
    } else {
      btn.classList.remove('on');
      btn.classList.add('off');
      if(icon) icon.textContent = '🔕';
      if(status) status.textContent = 'معطّل ❌';
    }
  },
  
  toggleEnabled(){
    this.enabled = !this.enabled;
    Store.set('adhanEnabled', this.enabled);
    this.renderToggle();
    toast(this.enabled ? '🔔 تم تفعيل الأذان' : '🔕 تم إلغاء الأذان');
    this.scheduleToday(true);
  },
  
  renderVolume(){
    const slider = document.getElementById('adhanVolume');
    const val = document.getElementById('volumeValue');
    const icon = document.getElementById('volIcon');
    
    if(slider) slider.value = this.volume;
    if(val) val.textContent = this.volume + '%';
    
    if(icon){
      if(this.volume === 0) icon.textContent = '🔇';
      else if(this.volume < 50) icon.textContent = '🔉';
      else icon.textContent = '🔊';
    }
    
    if(this.audio) this.audio.volume = this.volume / 100;
    if(this.duaAudio) this.duaAudio.volume = this.volume / 100;
  },
  
  setVolume(v){
    this.volume = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
    Store.set('adhanVolume', this.volume);
    this.renderVolume();
  },
  
  renderSoundChoices(){
    const box = document.getElementById('adhanChoices');
    if(!box) return;
    box.innerHTML = '';
    
    ADHAN_SOUNDS.filter(s => s.id !== 'adhan_fajr').forEach(s => {
      const div = document.createElement('div');
      div.className = 'audio-choice' + (this.adhanSound === s.id ? ' selected' : '');
      div.setAttribute('data-focus', '');
      div.innerHTML = 
        '<button class="audio-choice-btn" data-play="' + s.id + '" aria-label="تجربة">▶</button>' +
        '<div class="audio-choice-info">' +
          '<strong>' + s.name + '</strong>' +
          '<span>' + s.desc + '</span>' +
        '</div>';
      
      div.querySelector('[data-play]').onclick = (e) => {
        e.stopPropagation();
        this.playPreview(s.id);
      };
      div.onclick = () => { this.setAdhanSound(s.id); };
      
      box.appendChild(div);
    });
  },
  
  playPreview(id){
    const s = ADHAN_SOUNDS.find(x => x.id === id);
    if(!s) return;
    
    const url = this.getSoundUrl(s.file);
    this.audio.src = url;
    this.audio.currentTime = 0;
    this.audio.volume = this.volume / 100;
    
    this.audio.play()
      .then(() => this.updateTestBtn())
      .catch(() => toast('❌ تعذر التشغيل'));
  },
  
  getSoundUrl(file){
    // الأصوات مضمّنة داخل التطبيق (www/sounds)
    const known = ['adhan1', 'adhan2', 'adhan_fajr', 'dua_adhan'];
    return 'sounds/' + (known.indexOf(file) >= 0 ? file : 'adhan1') + '.mp3';
  },
  
  setAdhanSound(id){
    if(this.adhanSound === id) return;
    this.adhanSound = id;
    Store.set('adhanSound', id);
    this.renderSoundChoices();
    
    const s = ADHAN_SOUNDS.find(x => x.id === id);
    toast('✅ ' + s.name);
    
    this.scheduleToday(true);
  },
  
  renderPerPrayer(){
    const box = document.getElementById('perPrayerList');
    if(!box) return;
    box.innerHTML = '';
    
    const names = {
      fajr:'الفجر 🌙',
      dhuhr:'الظهر ☀️',
      asr:'العصر 🌤️',
      maghrib:'المغرب 🌆',
      isha:'العشاء 🌙'
    };
    
    Object.keys(names).forEach(k => {
      const mode = this.prayerModes[k] || 'full';
      
      const row = document.createElement('div');
      row.className = 'prayer-mode-row';
      row.innerHTML = 
        '<div class="prayer-mode-head">' +
          '<span class="p-name">' + names[k] + '</span>' +
          '<span class="p-time-s" id="pmTime-' + k + '">—</span>' +
        '</div>' +
        '<div class="prayer-mode-choices">' +
          '<button class="prayer-mode-btn ' + (mode === 'full' ? 'active-full' : '') + '" ' +
            'data-focus data-pm="' + k + '" data-mode="full" ' +
            'onclick="Adhan.setPrayerMode(\'' + k + '\',\'full\')">' +
            '<span class="pm-ico">🔊</span>' +
            '<span class="pm-lbl">أذان</span>' +
          '</button>' +
          '<button class="prayer-mode-btn ' + (mode === 'silent' ? 'active-silent' : '') + '" ' +
            'data-focus data-pm="' + k + '" data-mode="silent" ' +
            'onclick="Adhan.setPrayerMode(\'' + k + '\',\'silent\')">' +
            '<span class="pm-ico">🔔</span>' +
            '<span class="pm-lbl">صامت</span>' +
          '</button>' +
          '<button class="prayer-mode-btn ' + (mode === 'off' ? 'active-off' : '') + '" ' +
            'data-focus data-pm="' + k + '" data-mode="off" ' +
            'onclick="Adhan.setPrayerMode(\'' + k + '\',\'off\')">' +
            '<span class="pm-ico">🔕</span>' +
            '<span class="pm-lbl">إيقاف</span>' +
          '</button>' +
        '</div>';
      
      box.appendChild(row);
    });
    
    this.updatePrayerTimesInSettings();
  },
  
  updatePrayerTimesInSettings(){
    if(!Prayer.coords) return;
    if(typeof adhan === 'undefined') return;
    if(typeof Prayer.compute !== 'function') return;
    
    try{
      const p = Prayer.compute();
      const map = { fajr:p.fajr, dhuhr:p.dhuhr, asr:p.asr, maghrib:p.maghrib, isha:p.isha };
      
      Object.keys(map).forEach(k => {
        const el = document.getElementById('pmTime-' + k);
        if(el) el.textContent = Prayer.fmt(map[k]);
      });
    } catch(e){}
  },
  
  setPrayerMode(prayer, mode){
    this.prayerModes[prayer] = mode;
    Store.set('prayerModes', this.prayerModes);
    this.renderPerPrayer();
    
    const labels = {
      full:'🔊 أذان كامل',
      silent:'🔔 إشعار صامت',
      off:'🔕 إيقاف'
    };
    toast('✅ ' + labels[mode]);
    
    this.scheduleToday(true);
  },
  
  setPreMinute(v){
    this.preMinute = Math.max(0, parseInt(v, 10) || 0);
    Store.set('preAdhanMin', this.preMinute);
    this.renderPreMinuteLabel();
    this.scheduleToday(true);
  },
  
  renderPreMinuteLabel(){
    const lbl = document.getElementById('preAdhanLabel');
    if(!lbl) return;
    
    const map = { 0:'بدون', 5:'5 دقائق', 10:'10 دقائق', 15:'15 دقيقة', 30:'30 دقيقة' };
    lbl.textContent = map[this.preMinute] || 'بدون';
  },
  
  openPreMinutePicker(){
    const options = [
      { value:'0', label:'بدون' },
      { value:'5', label:'5 دقائق' },
      { value:'10', label:'10 دقائق' },
      { value:'15', label:'15 دقيقة' },
      { value:'30', label:'30 دقيقة' }
    ];
    
    Focus.openSelector(options, String(this.preMinute), (v) => {
      this.setPreMinute(v);
    }, 'التنبيه المبكر قبل الأذان');
  },
  
  async testAdhan(){
    if(this.audio && !this.audio.paused){
      this.stopTest();
      return;
    }
    
    try{
      if(typeof Quran !== 'undefined' && Quran.audio && !Quran.audio.paused){
        Quran.audio.pause();
        Quran.playing = false;
        Quran.updatePlayBtn();
      }
    } catch(e){}
    
    try{
      const url = this.getSoundUrl(this.adhanSound);
      this.audio.src = url;
      this.audio.currentTime = 0;
      this.audio.volume = this.volume / 100;
      
      await this.audio.play();
      this.updateTestBtn();
      toast('🔊 يعمل... اضغط إيقاف');
    } catch(e){
      toast('❌ تعذر التشغيل');
    }
  },
  
  stopTest(){
    try{
      this.audio.pause();
      this.audio.currentTime = 0;
      this.updateTestBtn();
      toast('⏹ تم الإيقاف');
    } catch(e){}
  },
  
  updateTestBtn(){
    const b = document.getElementById('btnTestAdhan');
    if(b){
      b.textContent = this.audio && !this.audio.paused ? '⏸ يعمل' : '🔊 تجربة الأذان';
    }
  },
  
  async testSchedule(){
    const at = Date.now() + 60000;
    const mode = this.prayerModes.fajr || 'full';
    const ok = await Notifier.scheduleAdhanByMode(at, 'تجريبية', false, mode, 999999);
    
    if(ok){
      toast('✅ رسالة تجريبية بعد دقيقة — أغلق التطبيق للتأكد');
    } else {
      toast('❌ فشل الجدولة');
    }
  },
  
  dayPrayers(date){
    if(!Prayer.coords || typeof adhan === 'undefined') return null;
    
    try{
      const c = new adhan.Coordinates(Prayer.coords.lat, Prayer.coords.lng);
      const method = Store.get('prayerMethod', 'MuslimWorldLeague');
      const factory = adhan.CalculationMethod[method] || adhan.CalculationMethod.MuslimWorldLeague;
      const params = factory();
      params.madhab = Store.get('prayerMadhab', 'shafi') === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
      
      const pt = new adhan.PrayerTimes(c, date, params);
      
      return {
        fajr: { name:'الفجر', time:pt.fajr },
        dhuhr: { name:'الظهر', time:pt.dhuhr },
        asr: { name:'العصر', time:pt.asr },
        maghrib: { name:'المغرب', time:pt.maghrib },
        isha: { name:'العشاء', time:pt.isha }
      };
    } catch(e){ return null; }
  },
  
  check(){
    if(!Prayer.coords) return;
    if(typeof adhan === 'undefined') return;
    if(typeof Prayer.compute !== 'function') return;
    
    const now = new Date();
    let p;
    try{ p = this.dayPrayers(now); } catch(e){ return; }
    if(!p) return;
    
    Object.entries(p).forEach(([k, pr]) => {
      const mode = this.prayerModes[k] || 'full';
      if(mode === 'off') return;
      
      const diff = (pr.time - now) / 1000;
      
      if(diff >= -12 && diff <= 12){
        const key = now.toDateString() + '_' + k + '_adhan';
        if(!this.playedToday[key]){
          this.playedToday[key] = true;
          
          if(this.enabled){
            const isFajr = (k === 'fajr');
            if(mode === 'full'){
              // على الهاتف، الإشعار المجدول يشغّل الأذان بنفسه؛ لا نكرّره من داخل التطبيق
              const notifPlays = CapacitorNative.isNative() && Notifier.permOK;
              if(!notifPlays) this.playLocal(pr.name, isFajr);
              this.showAdhanScreen(pr.name, isFajr);
            }
          }
        }
      }
      
      if(this.preMinute > 0){
        const pre = this.preMinute * 60;
        if(diff >= pre - 12 && diff <= pre + 12){
          const key = now.toDateString() + '_' + k + '_pre';
          if(!this.playedToday[key]){
            this.playedToday[key] = true;
            Notifier.show(
              '⏰ اقتربت صلاة ' + pr.name,
              'باقي ' + this.preMinute + ' دقيقة',
              { id:this.idFor(now, k) + 500, channel:'general_channel' }
            );
          }
        }
      }
    });
    
    try{ Notifier.checkEvents(); } catch(e){}
    this.scheduleToday(false);
  },
  
  async playLocal(name, isFajr){
    try{
      const file = isFajr ? 'adhan_fajr' : this.adhanSound;
      const url = this.getSoundUrl(file);
      this.audio.src = url;
      this.audio.currentTime = 0;
      this.audio.volume = this.volume / 100;
      
      await this.audio.play();
      this.updateTestBtn();
    } catch(e){}
  },
  
  idFor(date, k){
    const d = date.toISOString().slice(0, 10).replace(/-/g, '');
    const n = { fajr:1, dhuhr:2, asr:3, maghrib:4, isha:5 }[k] || 9;
    return parseInt(d.slice(-6), 10) * 10 + n;
  },
  
  async scheduleToday(force){
    if(typeof Prayer.compute !== 'function') return;
    
    const useNative = CapacitorNative.isNative() || this.isCordova();
    if(!useNative || !Prayer.coords || typeof adhan === 'undefined') return;
    
    if(!this.enabled){
      try{
        this.lastScheduleKey = 'disabled';
        await Notifier.cancelAllScheduled();
      } catch(e){}
      return;
    }
    
    const now = new Date();
    const key = now.toDateString() + '|' +
      Prayer.coords.lat.toFixed(4) + ',' + Prayer.coords.lng.toFixed(4) + '|' +
      Store.get('prayerMethod', 'MuslimWorldLeague') + '|' +
      Store.get('prayerMadhab', 'shafi') + '|' +
      JSON.stringify(this.prayerModes) + '|' +
      this.preMinute + '|' + this.enabled + '|' + this.adhanSound;
    
    if(!force && key === this.lastScheduleKey) return;
    this.lastScheduleKey = key;
    
    const list = [];
    for(let offset = 0; offset < this.scheduleDays; offset++){
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const p = this.dayPrayers(date);
      if(!p) continue;
      
      Object.entries(p).forEach(([k, pr]) => {
        const mode = this.prayerModes[k] || 'full';
        if(mode === 'off') return;
        if(pr.time <= now) return;
        
        list.push({
          id: this.idFor(date, k),
          name: pr.name,
          at: pr.time,
          isFajr: (k === 'fajr'),
          mode: mode
        });
        
        if(this.preMinute > 0){
          const at = new Date(pr.time.getTime() - this.preMinute * 60000);
          if(at > now){
            list.push({
              id: this.idFor(date, k) + 500,
              name: pr.name,
              at: at,
              isPre: true
            });
          }
        }
      });
    }
    
    await Notifier.cancelAllScheduled();
    
    for(const item of list){
      if(item.isPre){
        await Notifier.show(
          '⏰ اقتربت صلاة ' + item.name,
          'باقي ' + this.preMinute + ' دقيقة',
          { id:item.id, at:item.at, channel:'general_channel', sound:'default' }
        );
      } else {
        await Notifier.scheduleAdhanByMode(
          item.at, item.name, item.isFajr, item.mode, item.id
        );
      }
    }
  },
  
  stop(){
    try{
      this.audio.pause();
      this.audio.currentTime = 0;
      this.updateTestBtn();
    } catch(e){}
  }
};
