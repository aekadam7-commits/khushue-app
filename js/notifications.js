const Notifier = {
  permOK: false,
  
  init(){
    this.updateBadge();
    this.setupNativeChannels();
    this.refreshPermission();
  },
  
  refreshPermission(){
    try{
      if(CapacitorNative.isNative() && CapacitorNative.notif()){
        CapacitorNative.notif().checkPermissions()
          .then(r => { this.permOK = (r.display === 'granted'); })
          .catch(()=>{});
      }
    } catch(e){}
  },
  
  // إلغاء كل الإشعارات المجدولة فعلاً (cancel بقائمة فارغة لا يلغي شيئاً)
  async cancelAllScheduled(){
    try{
      if(CapacitorNative.isNative() && CapacitorNative.notif()){
        const LN = CapacitorNative.notif();
        const p = await LN.getPending();
        if(p && p.notifications && p.notifications.length){
          await LN.cancel({ notifications: p.notifications.map(x => ({ id: x.id })) });
        }
      } else if(this.isCordova()){
        this.local().cancelAll();
      }
    } catch(e){}
  },
  
  isCordova(){
    return !!(window.cordova && window.cordova.plugins && 
              window.cordova.plugins.notification && 
              window.cordova.plugins.notification.local);
  },
  
  isNative(){ return CapacitorNative.isNative(); },
  
  local(){
    return this.isCordova() ? window.cordova.plugins.notification.local : null;
  },
  
  setupNativeChannels(){
    if(!CapacitorNative.isNative()) return;
    try{
      const LN = CapacitorNative.notif();
      if(LN && LN.createChannel){
        // قناة مستقلة لكل صوت أذان (على أندرويد 8+ الصوت يُحدَّد من القناة لا من الإشعار)
        ['adhan1', 'adhan2'].forEach(s => {
          LN.createChannel({
            id:'adhan_ch_' + s,
            name:'أذان الصلوات (' + (s === 'adhan1' ? 'الأول' : 'الثاني') + ')',
            description:'تنبيهات الصلوات الخمس',
            importance:5,
            vibration:true,
            sound:s
          }).catch(()=>{});
        });
        
        LN.createChannel({
          id:'adhan_fajr_channel',
          name:'أذان الفجر',
          description:'تنبيه صلاة الفجر',
          importance:5,
          vibration:true,
          sound:'adhan_fajr'
        }).catch(()=>{});
        
        LN.createChannel({
          id:'dua_channel',
          name:'دعاء بعد الأذان',
          description:'دعاء بعد انتهاء الأذان',
          importance:4,
          vibration:false,
          sound:'dua_adhan'
        }).catch(()=>{});
        
        LN.createChannel({
          id:'silent_channel',
          name:'إشعارات صامتة',
          description:'إشعارات بدون صوت',
          importance:3,
          vibration:true,
          sound:null
        }).catch(()=>{});
        
        LN.createChannel({
          id:'general_channel',
          name:'تنبيهات خُشوع',
          description:'التنبيهات العامة',
          importance:4,
          vibration:true
        }).catch(()=>{});
      }
    } catch(e){}
  },
  
  updateBadge(){
    const b = document.getElementById('notifStatusBadge');
    if(!b) return;
    
    if(CapacitorNative.isNative() || this.isCordova()){
      b.textContent = 'APK مفعّلة';
      b.className = 'notif-badge notif-on';
      return;
    }
    
    if(!('Notification' in window)){
      b.textContent = 'غير مدعومة';
      b.className = 'notif-badge notif-off';
      return;
    }
    
    b.textContent = Notification.permission === 'granted' ? 'مفعّلة'
                  : (Notification.permission === 'denied' ? 'مرفوضة' : 'معطلة');
    b.className = 'notif-badge ' + (Notification.permission === 'granted' ? 'notif-on' : 'notif-off');
  },
  
  async requestPermission(){
    if(CapacitorNative.isNative() && CapacitorNative.notif()){
      try{
        const LN = CapacitorNative.notif();
        const r = await LN.requestPermissions();
        const ok = r.display === 'granted';
        this.permOK = ok;
        this.updateBadge();
        if(ok) setTimeout(() => this.openExactAlarmSettings(), 800);
        toast(ok ? '✅ تم تفعيل الإشعارات' : '❌ لم يُمنح الإذن');
        return;
      } catch(e){}
    }
    
    if(this.isCordova()){
      try{
        this.local().requestPermission(granted => {
          this.updateBadge();
          toast(granted ? '✅ تم تفعيل الإشعارات' : '❌ لم يُمنح');
        });
        return;
      } catch(e){}
    }
    
    if(!('Notification' in window)){
      toast('❌ غير مدعومة');
      return;
    }
    
    try{
      const q = await Notification.requestPermission();
      this.updateBadge();
      toast(q === 'granted' ? '✅ تم تفعيل الإشعارات' : '❌ لم يُمنح');
    } catch(e){}
  },
  
  openExactAlarmSettings(){
    if(CapacitorNative.isNative() && CapacitorNative.notif()){
      try{
        const LN = CapacitorNative.notif();
        if(LN.checkExactNotificationSetting){
          LN.checkExactNotificationSetting().then(r => {
            if(r.exact_alarm !== 'granted' && LN.changeExactNotificationSetting){
              LN.changeExactNotificationSetting();
            }
          }).catch(()=>{});
          return;
        }
      } catch(e){}
    }
  },
  
  async show(title, body, opts){
    opts = opts || {};
    
    if(CapacitorNative.isNative() && CapacitorNative.notif()){
      try{
        const LN = CapacitorNative.notif();
        const n = {
          id: opts.id || (Date.now() % 2147483647),
          title: title,
          body: body,
          channelId: opts.channel || 'general_channel',
          smallIcon: 'ic_stat_adhan',
          sound: opts.sound !== undefined ? opts.sound : 'default'
        };
        
        if(opts.at){
          n.schedule = { at: new Date(opts.at), allowWhileIdle: true };
          n.ongoing = false;
          n.autoCancel = true;
        }
        if(opts.extra) n.extra = opts.extra;
        
        await LN.schedule({ notifications:[n] });
        return true;
      } catch(e){
        return false;
      }
    }
    
    if(this.isCordova()){
      try{
        const schedule = {
          id: opts.id || Date.now() % 2147483647,
          title: title,
          text: body,
          androidChannelId: opts.channel || 'general_channel',
          androidAlarmType: 'RTC_WAKEUP',
          androidAllowWhileIdle: true,
          autoCancel: true,
          sound: opts.sound !== undefined ? opts.sound : 'default',
          launch: true
        };
        if(opts.at) schedule.trigger = { at: new Date(opts.at) };
        if(opts.extra) schedule.data = opts.extra;
        
        this.local().schedule(schedule);
        return true;
      } catch(e){ return false; }
    }
    
    try{
      if('Notification' in window && Notification.permission === 'granted'){
        new Notification(title, { body: body });
      }
    } catch(e){}
    
    return false;
  },
  
  async scheduleAdhanByMode(at, prayerName, isFajr, mode, id){
    if(mode === 'off') return false;
    
    if(mode === 'silent'){
      return await this.show(
        '🕌 حان وقت صلاة ' + prayerName,
        'الله أكبر — حي على الصلاة',
        {
          id: id,
          at: at,
          channel: 'silent_channel',
          sound: null,
          extra: { type:'silent', prayer:prayerName }
        }
      );
    }
    
    const soundFile = isFajr ? 'adhan_fajr' : Store.get('adhanSound', 'adhan1');
    const channelId = isFajr ? 'adhan_fajr_channel' : 'adhan_ch_' + (soundFile === 'adhan2' ? 'adhan2' : 'adhan1');
    const duaAt = new Date(new Date(at).getTime() + 4 * 60 * 1000);
    const duaId = id + 9000000;
    
    if(CapacitorNative.isNative() && CapacitorNative.notif()){
      try{
        const LN = CapacitorNative.notif();
        await LN.schedule({
          notifications: [
            {
              id: id,
              title: '🕌 حان وقت صلاة ' + prayerName,
              body: isFajr ? 'الصلاة خير من النوم — حي على الصلاة' : 'الله أكبر — حي على الصلاة',
              channelId: channelId,
              smallIcon: 'ic_stat_adhan',
              sound: soundFile,
              schedule: { at: new Date(at), allowWhileIdle: true },
              autoCancel: true,
              extra: { type:'adhan', prayer:prayerName, isFajr:isFajr }
            },
            {
              id: duaId,
              title: '🤲 دُعَاءُ بَعْدَ الأَذَان',
              body: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ...',
              channelId: 'dua_channel',
              smallIcon: 'ic_stat_adhan',
              sound: 'dua_adhan',
              schedule: { at: duaAt, allowWhileIdle: true },
              autoCancel: true,
              extra: { type:'dua' }
            }
          ]
        });
        return true;
      } catch(e){
        return false;
      }
    }
    
    if(this.isCordova()){
      try{
        this.local().schedule([
          {
            id: id,
            title: '🕌 حان وقت صلاة ' + prayerName,
            text: isFajr ? 'الصلاة خير من النوم' : 'الله أكبر',
            androidChannelId: channelId,
            androidAlarmType: 'RTC_WAKEUP',
            androidAllowWhileIdle: true,
            sound: soundFile,
            launch: true,
            trigger: { at: new Date(at) },
            data: { type:'adhan', prayer:prayerName, isFajr:isFajr }
          },
          {
            id: duaId,
            title: '🤲 دُعَاءُ بَعْدَ الأَذَان',
            text: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ...',
            androidChannelId: 'dua_channel',
            androidAlarmType: 'RTC_WAKEUP',
            androidAllowWhileIdle: true,
            sound: 'dua_adhan',
            launch: true,
            trigger: { at: duaAt },
            data: { type:'dua' }
          }
        ]);
        return true;
      } catch(e){ return false; }
    }
    
    return false;
  },
  
  toggleEvents(v){ Store.set('eventsNotif', v); },
  
  isEventsEnabled(){ return Store.get('eventsNotif', true); },
  
  checkEvents(){
    if(!this.isEventsEnabled()) return;
    
    const allowed = CapacitorNative.isNative() || this.isCordova() ||
                    ('Notification' in window && Notification.permission === 'granted');
    if(!allowed) return;
    
    if(typeof Calendar === 'undefined' || typeof Hijri === 'undefined') return;
    
    try{
      const now = new Date();
      const h = Hijri.toHijri(now);
      const key = 'event_' + h.year + '_' + h.month + '_' + h.day;
      
      if(Store.get('lastEventNotif', '') === key) return;
      
      const events = Calendar.getEventForDay(h);
      if(events && events.length){
        this.show(
          '🕌 ' + events[0],
          'اليوم ' + h.day + ' ' + HMONTHS[h.month-1] + ' ' + h.year + ' هـ',
          { channel:'general_channel' }
        );
        Store.set('lastEventNotif', key);
      }
    } catch(e){}
  }
};
