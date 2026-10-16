var Calendar = {
  current: new Date(),
  events: [
    {month:1,day:1,name:'رأس السنة الهجرية'},
    {month:1,day:10,name:'يوم عاشوراء'},
    {month:3,day:12,name:'المولد النبوي'},
    {month:7,day:27,name:'الإسراء والمعراج'},
    {month:8,day:15,name:'ليلة النصف من شعبان'},
    {month:9,day:1,name:'أول رمضان'},
    {month:9,day:27,name:'ليلة القدر (مرجحة)'},
    {month:10,day:1,name:'عيد الفطر'},
    {month:12,day:9,name:'يوم عرفة'},
    {month:12,day:10,name:'عيد الأضحى'}
  ],
  
  init: function(){
    this.render();
  },
  
  prev: function(){
    this.current = new Date(this.current.getFullYear(), this.current.getMonth() - 1, 1);
    this.render();
  },
  
  next: function(){
    this.current = new Date(this.current.getFullYear(), this.current.getMonth() + 1, 1);
    this.render();
  },
  
  getEventForDay: function(h){
    return this.events
      .filter(function(e){ return e.month === Number(h.month) && e.day === Number(h.day); })
      .map(function(e){ return e.name; });
  },
  
  // استخراج الشهر الهجري السائد من أيام الشهر الميلادي
  getDominantHijriMonth: function(firstDay, lastDay){
    var mid = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      Math.floor((firstDay.getDate() + lastDay.getDate()) / 2)
    );
    return Hijri.toHijri(mid);
  },
  
  render: function(){
    var grid = document.getElementById('calGrid');
    if(!grid) return;
    
    var d = this.current;
    var firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    var lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    var dominant = this.getDominantHijriMonth(firstDay, lastDay);
    
    // العنوان المزدوج
    var title = document.getElementById('calTitle');
    if(title){
      title.innerHTML = 
        '<div class="cal-title-hijri">' + HMONTHS[dominant.month - 1] + ' ' + dominant.year + ' هـ</div>' +
        '<div class="cal-title-greg">' + GMONTHS[d.getMonth()] + ' ' + d.getFullYear() + '</div>';
    }
    
    grid.innerHTML = '';
    
    var firstWeekday = firstDay.getDay();
    var daysInMonth = lastDay.getDate();
    var today = new Date();
    
    for(var i = 0; i < firstWeekday; i++){
      var blank = document.createElement('div');
      blank.className = 'cal-day empty';
      blank.setAttribute('aria-hidden', 'true');
      grid.appendChild(blank);
    }
    
    for(var day = 1; day <= daysInMonth; day++){
      var gd = new Date(d.getFullYear(), d.getMonth(), day);
      var hij = Hijri.toHijri(gd);
      
      var cell = document.createElement('div');
      cell.className = 'cal-day';
      
      if(today.getFullYear() === gd.getFullYear() &&
         today.getMonth() === gd.getMonth() &&
         today.getDate() === day){
        cell.classList.add('today');
      }
      
      var hd = document.createElement('div');
      hd.className = 'h-day';
      hd.textContent = hij.day;
      
      var gday = document.createElement('div');
      gday.className = 'g-day';
      gday.textContent = day;
      
      cell.appendChild(hd);
      cell.appendChild(gday);
      cell.title = Hijri.format(gd);
      grid.appendChild(cell);
    }
    
    var list = document.getElementById('eventsList');
    if(list){
      list.innerHTML = '';
      this.events.forEach(function(ev){
        var row = document.createElement('div');
        row.className = 'event-row';
        
        var label = document.createElement('strong');
        label.textContent = ev.day + ' ' + HMONTHS[ev.month - 1];
        
        var name = document.createElement('span');
        name.textContent = ev.name;
        
        row.appendChild(label);
        row.appendChild(name);
        list.appendChild(row);
      });
    }
  }
};
