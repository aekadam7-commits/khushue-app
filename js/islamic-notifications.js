/* ============================================================
   خُشوع — islamic-notifications.js
   الإشعارات الإسلامية التلقائية اليومية
   ============================================================ */

const IslamicNotifications = {
  enabled: false,
  settings: {
    morningAdhkar: true,
    eveningAdhkar: true,
    dailyAyah: true,
    fridayKahf: true
  },
  
  init(){
    this.enabled = Store.get('islamicNotifEnabled', false);
    const saved = Store.get('islamicNotifSettings', null);
    if(saved && typeof saved === 'object'){
      this.settings = Object.assign(this.settings, saved);
    }
    
    this.renderSettings();
    
    if(this.enabled){
      this.schedule();
    }
  },
  
  // إعدادات افتراضية
  renderSettings(){
    const box = document.getElementById('islamicNotifList');
    if(!box) return;
    box.innerHTML = '';
    
    const items = [
      { id:'morningAdhkar', icon:'🌅', name:'أذكار الصباح', desc:'يوميًا الساعة 6:00 صباحًا' },
      { id:'eveningAdhkar', icon:'🌇', name:'أذكار المساء', desc:'يوميًا الساعة 5:30 مساءً' },
      { id:'dailyAyah', icon:'📖', name:'آية اليوم', desc:'يوميًا الساعة 8:00 صباحًا' },
      { id:'fridayKahf', icon:'🕌', name:'سورة الكهف', desc:'كل جمعة الساعة 9:00 صباحًا' }
    ];
    
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'adhan-row';
      row.innerHTML = 
        '<span class="pr-name">' + it.icon + ' ' + it.name + 
          '<br><small style="font-size:10px;color:var(--muted);font-weight:400">' + it.desc + '</small>' +
        '</span>' +
        '<input type="checkbox" data-focus ' + 
          (this.settings[it.id] ? 'checked' : '') +
          ' onchange="IslamicNotifications.toggleSetting(\'' + it.id + '\',this.checked)">';
      box.appendChild(row);
    });
  },
  
  toggleSetting(key, value){
    this.settings[key] = !!value;
    Store.set('islamicNotifSettings', this.settings);
    if(this.enabled) this.schedule();
  },
  
  enable(value){
    this.enabled = !!value;
    Store.set('islamicNotifEnabled', this.enabled);
    
    if(this.enabled){
      this.schedule();
      toast('✅ تم تفعيل الإشعارات الإسلامية');
    } else {
      this.cancel();
      toast('⏹ تم إلغاء الإشعارات الإسلامية');
    }
  },
  
  // جدولة الإشعارات اليومية
  async schedule(){
    if(!CapacitorNative.isNative() && !Notifier.isCordova()) return;
    
    await this.cancel();
    
    const now = new Date();
    const schedules = [];
    
    // أذكار الصباح — 6:00 صباحًا
    if(this.settings.morningAdhkar){
      schedules.push(this.makeDaily(6, 0, '🌅 أذكار الصباح', 
        'حان وقت أذكار الصباح — ﴿ أَلا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾', 1001));
    }
    
    // أذكار المساء — 17:30
    if(this.settings.eveningAdhkar){
      schedules.push(this.makeDaily(17, 30, '🌇 أذكار المساء',
        'حان وقت أذكار المساء — لا تنسَ ذكر الله', 1002));
    }
    
    // آية اليوم — 8:00
    if(this.settings.dailyAyah){
      schedules.push(this.makeDaily(8, 0, '📖 آية اليوم',
        this.getRandomAyah(), 1003));
    }
    
    // سورة الكهف — الجمعة 9:00
    if(this.settings.fridayKahf){
      schedules.push(this.makeWeekly(5, 9, 0, '🕌 سورة الكهف',
        'يوم الجمعة — لا تنسَ قراءة سورة الكهف', 1004));
    }
    
    // إرسال
    for(const s of schedules){
      await Notifier.show(s.title, s.body, {
        id: s.id,
        at: s.at,
        channel: 'general_channel',
        sound: 'default'
      });
    }
  },
  
  makeDaily(h, m, title, body, id){
    const now = new Date();
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    
    if(at <= now){
      at.setDate(at.getDate() + 1);
    }
    
    return { title: title, body: body, at: at, id: id };
  },
  
  makeWeekly(dayOfWeek, h, m, title, body, id){
    const now = new Date();
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    
    const diff = (dayOfWeek - now.getDay() + 7) % 7;
    at.setDate(at.getDate() + diff);
    
    if(at <= now) at.setDate(at.getDate() + 7);
    
    return { title: title, body: body, at: at, id: id };
  },
  
  getRandomAyah(){
    const ayahs = [
      '﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾ — الشرح: 6',
      '﴿ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴾ — الطلاق: 3',
      '﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾ — الرعد: 28',
      '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾ — طه: 114',
      '﴿ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴾ — البقرة: 153',
      '﴿ فَاذْكُرُونِي أَذْكُرْكُمْ ﴾ — البقرة: 152',
      '﴿ وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ﴾ — الحديد: 4'
    ];
    return ayahs[Math.floor(Math.random() * ayahs.length)];
  },
  
  async cancel(){
    if(CapacitorNative.isNative() && CapacitorNative.notif()){
      try{
        const LN = CapacitorNative.notif();
        const pending = await LN.getPending().catch(() => ({ notifications:[] }));
        
        const toCancel = (pending.notifications || [])
          .filter(n => n.id >= 1001 && n.id <= 1004)
          .map(n => ({ id: n.id }));
        
        if(toCancel.length){
          await LN.cancel({ notifications: toCancel });
        }
      } catch(e){}
    } else if(Notifier.isCordova()){
      try{
        Notifier.local().cancel([1001, 1002, 1003, 1004]);
      } catch(e){}
    }
  }
};
