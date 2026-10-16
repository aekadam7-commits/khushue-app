/* خُشوع — حدث في مثل هذا اليوم: قائمة محلية مع توضيح التواريخ المختلف فيها */
const TodayHistory = {
  events: [
    {month:1,day:10,title:'يوم عاشوراء',summary:'اليوم العاشر من المحرّم، وهو يوم صيام ثابت في السنة. يرتبط أيضًا بوقائع تاريخية متعددة، فلا تُنسب واقعة تاريخية بعينها إليه دون توثيق.',place:'المحرّم',confidence:'ثابت فضل صيامه؛ أما ربطه ببعض الوقائع فبحسب الروايات'},
    {month:3,day:12,title:'تاريخ مشهور للمولد النبوي',summary:'يُذكر الثاني عشر من ربيع الأول في عدد من كتب السيرة بوصفه تاريخًا لمولد النبي محمد ﷺ، لكن يوم الميلاد الدقيق محل خلاف بين المؤرخين.',place:'مكة المكرمة',confidence:'التاريخ الدقيق مختلف فيه'},
    {month:7,day:27,title:'ليلة الإسراء والمعراج — تاريخ مشهور',summary:'يشتهر عند كثير من الناس ربط ليلة السابع والعشرين من رجب بالإسراء والمعراج، لكن لا يثبت تاريخ محدد للواقعة بدليل صحيح صريح، لذا لا نجزم بهذا اليوم.',place:'المسجد الحرام والمسجد الأقصى',confidence:'تحديد اليوم غير ثابت على وجه الجزم'},
    {month:9,day:17,title:'غزوة بدر الكبرى — التاريخ المشهور',summary:'وقعت غزوة بدر في السنة الثانية للهجرة، ويُذكر السابع عشر من رمضان تاريخًا مشهورًا لها. كانت محطة بارزة في تاريخ المجتمع الإسلامي الأول.',place:'بدر',confidence:'السنة ثابتة، وتفاصيل اليوم تذكرها كتب السيرة'},
    {month:9,day:20,title:'فتح مكة — التاريخ المشهور',summary:'يُذكر العشرون من رمضان سنة 8 هـ تاريخًا مشهورًا لفتح مكة، مع وجود اختلاف في بعض تفاصيل التأريخ. ويبرز الحدث عفو النبي ﷺ عند دخوله مكة.',place:'مكة المكرمة',confidence:'التاريخ مشهور مع اختلاف في بعض الروايات'},
    {month:3,day:12,title:'وفاة النبي ﷺ — أحد التواريخ المشهورة',summary:'توفي النبي محمد ﷺ في السنة الحادية عشرة للهجرة في المدينة المنورة. أما تعيين اليوم الدقيق من ربيع الأول ففيه خلاف تاريخي.',place:'المدينة المنورة',confidence:'السنة ثابتة؛ اليوم الدقيق مختلف فيه'}
  ],
  months:['','محرّم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوّال','ذو القعدة','ذو الحجة'],
  escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  getHijriDate(){
    const now=new Date();
    try{
      const fmt=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'numeric',year:'numeric'});
      const parts=Object.fromEntries(fmt.formatToParts(now).map(p=>[p.type,p.value]));
      const day=Number(parts.day), month=Number(parts.month), year=Number(parts.year);
      if(day&&month&&year)return {day,month,year,formatted:`${day} ${this.months[month]||''} ${year} هـ`};
    }catch(e){}
    try{
      const fmt=new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn',{day:'numeric',month:'numeric',year:'numeric'});
      const parts=Object.fromEntries(fmt.formatToParts(now).map(p=>[p.type,p.value]));
      const day=Number(parts.day),month=Number(parts.month),year=Number(parts.year);
      if(day&&month&&year)return {day,month,year,formatted:`${day} ${this.months[month]||''} ${year} هـ`};
    }catch(e){}
    return {day:0,month:0,year:0,formatted:'تعذّر حساب التاريخ الهجري على هذا الجهاز'};
  },
  init(){this.renderHome();this.renderPage();},
  renderHome(){
    const date=this.getHijriDate();
    const d=document.getElementById('todayHistoryHijri'),t=document.getElementById('todayHistoryTitle'),s=document.getElementById('todayHistorySummary');
    if(d)d.textContent=date.formatted;
    const event=this.events.find(e=>e.month===date.month&&e.day===date.day);
    if(t)t.textContent=event?event.title:'استكشف أحداثًا من التاريخ الإسلامي';
    if(s)s.textContent=event?event.summary:'لا تتضمن قائمتنا المختارة حدثًا موثقًا على وجه الخصوص لهذا اليوم؛ يمكنك تصفح الأحداث المشهورة وملاحظات تواريخها أدناه.';
  },
  renderPage(){
    const date=this.getHijriDate(),current=document.getElementById('todayHistoryCurrent'),all=document.getElementById('todayHistoryAll');
    if(!current||!all)return;
    const found=this.events.filter(e=>e.month===date.month&&e.day===date.day);
    current.innerHTML=`<div class="today-history-date-pill">📅 التاريخ الهجري اليوم: ${this.escape(date.formatted)}</div>`+(found.length?found.map(e=>this.card(e,true)).join(''):`<article class="today-history-card today-history-no-event"><h3>لا يوجد حدث مؤكد في قائمتنا لهذا اليوم</h3><p>لا يعني ذلك أنه لم تقع أحداث تاريخية؛ إنما لا نعرض تاريخًا محددًا دون توثيق كافٍ. تصفّح الأحداث المشهورة أدناه مع بيان مواضع الاختلاف.</p></article>`);
    const unique=[];const seen=new Set();for(const e of this.events){const key=e.title+'|'+e.summary;if(!seen.has(key)){seen.add(key);unique.push(e);}}
    all.innerHTML=unique.map(e=>this.card(e,false)).join('');
  },
  card(e,isToday){return `<article class="today-history-card ${isToday?'is-today':''}"><div class="today-history-card-top"><span class="today-history-tag">${this.escape(this.months[e.month]||'')}</span>${isToday?'<span class="today-history-today-label">حدث اليوم</span>':''}</div><h3>${this.escape(e.title)}</h3><p>${this.escape(e.summary)}</p><div class="today-history-meta">📍 ${this.escape(e.place)}</div><small>ملاحظة تاريخية: ${this.escape(e.confidence)}</small></article>`;}
};
document.addEventListener('DOMContentLoaded',()=>TodayHistory.init());
