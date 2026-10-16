/* ============================================================
   خُشوع — sleep-timer.js
   وضع النوم (إيقاف الصوت تلقائيًا بعد مدة)
   ============================================================ */

const SleepTimer = {
  active: false,
  remaining: 0,
  interval: null,
  
  init(){
    // استرجاع الإعداد
    this.defaultMinutes = parseInt(Store.get('sleepTimerDefault', '30'), 10) || 30;
  },
  
  // بدء المؤقت
  start(minutes){
    if(!minutes) minutes = this.defaultMinutes;
    
    this.stop(); // إلغاء أي مؤقت سابق
    
    this.active = true;
    this.remaining = minutes * 60;
    
    this.showIndicator();
    this.updateIndicator();
    
    this.interval = setInterval(() => {
      this.remaining--;
      
      if(this.remaining <= 0){
        this.stop();
        this.onEnd();
        return;
      }
      
      this.updateIndicator();
    }, 1000);
    
    toast('⏰ المؤقت: ' + minutes + ' دقيقة');
  },
  
  // إلغاء المؤقت
  stop(){
    if(this.interval){
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.active = false;
    this.remaining = 0;
    this.hideIndicator();
  },
  
  // عند انتهاء الوقت
  onEnd(){
    // إيقاف كل الأصوات
    try{
      if(typeof Quran !== 'undefined' && Quran.audio){
        Quran.audio.pause();
        Quran.playing = false;
        Quran.updatePlayBtn();
      }
    } catch(e){}
    
    try{
      if(typeof QuranListen !== 'undefined' && QuranListen.audio){
        QuranListen.audio.pause();
        QuranListen.playing = false;
        QuranListen.updatePlayBtn();
      }
    } catch(e){}
    
    toast('⏰ انتهى وقت المؤقت — تم الإيقاف');
  },
  
  // عرض مؤشر المؤقت (زر عائم)
  showIndicator(){
    let el = document.getElementById('sleepTimerIndicator');
    
    if(!el){
      el = document.createElement('div');
      el.id = 'sleepTimerIndicator';
      el.className = 'sleep-timer-indicator';
      el.setAttribute('data-focus', '');
      el.onclick = () => this.openMenu();
      document.body.appendChild(el);
    }
    
    el.classList.remove('hidden');
  },
  
  hideIndicator(){
    const el = document.getElementById('sleepTimerIndicator');
    if(el) el.classList.add('hidden');
  },
  
  updateIndicator(){
    const el = document.getElementById('sleepTimerIndicator');
    if(!el) return;
    
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    
    el.innerHTML = '⏰ ' + m + ':' + String(s).padStart(2, '0');
  },
  
  // قائمة اختيار المدة
  openMenu(){
    const options = [
      { value:'15', label:'15 دقيقة' },
      { value:'30', label:'30 دقيقة' },
      { value:'45', label:'45 دقيقة' },
      { value:'60', label:'ساعة واحدة' },
      { value:'90', label:'ساعة ونصف' },
      { value:'120', label:'ساعتان' }
    ];
    
    let html = '<h3>⏰ وضع النوم</h3>';
    html += '<p class="text-center text-muted" style="font-size:12px;margin-bottom:14px;line-height:1.8">' +
      'سيُوقف الصوت تلقائيًا بعد المدة المختارة' +
    '</p>';
    
    options.forEach(o => {
      html += '<div class="reciter-option" data-focus ' +
        'onclick="SleepTimer.start(' + o.value + ');App.closeModal()">' +
          '<span>' + o.label + '</span>' +
        '</div>';
    });
    
    if(this.active){
      html += '<button class="btn-secondary" data-focus ' +
        'onclick="SleepTimer.stop();App.closeModal()" ' +
        'style="width:100%;margin-top:10px;border-color:#ef4444;color:#dc2626">' +
        '⏹ إلغاء المؤقت' +
      '</button>';
    }
    
    html += '<button class="btn-secondary" data-focus ' +
      'onclick="App.closeModal()" style="width:100%;margin-top:8px">إغلاق</button>';
    
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    if(Focus.enabled) setTimeout(() => Focus.reset(), 100);
  }
};
