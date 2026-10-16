/* خُشوع — أقسام القراءة الإسلامية، بياناتها تُضمّن وقت البناء في www/data/islamic-library.js */
const IslamicSections = {
  data: null,
  loading: null,
  type: 'seerah',
  list: [],
  filtered: [],
  index: 0,
  readerType: null,
  fontSize: 22,
  cats: ['الكل','إسلامي','الجزائر','فلسطين'],

  async ensure(){
    if(window.ISLAMIC_CONTENT) { this.data = window.ISLAMIC_CONTENT; return this.data; }
    if(this.loading) return this.loading;
    this.loading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'data/islamic-library.js';
      s.onload = () => { this.data = window.ISLAMIC_CONTENT || null; resolve(this.data); };
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    const result = await this.loading;
    if(!result) this.loading = null;
    return result;
  },

  async init(){
    const data = await this.ensure();
    if(!data){
      const box = document.getElementById('islamicContent');
      if(box) box.innerHTML = '<div class="card"><h3>المحتوى المحلي غير جاهز</h3><p>أعد بناء التطبيق من المستودع حتى تُضمّن ملفات المحتوى داخله. لا يلزم الإنترنت بعد تضمينها.</p></div>';
      return;
    }
    this.render();
  },

  setType(type){
    this.type = type;
    const search = document.getElementById('islamicSearch');
    if(search) search.value = '';
    document.querySelectorAll('[data-islamic-type]').forEach(b => b.classList.toggle('active', b.dataset.islamicType === type));
    this.render();
  },

  goTo(type){ App.go('islamic-library'); this.setType(type); },
  titleFor(type){ return ({seerah:'السيرة النبوية',prophets:'قصص الأنبياء',hisn:'حصن المسلم',events:'حدث في مثل هذا اليوم'})[type] || 'المكتبة الإسلامية'; },
  sourceList(){
    if(!this.data) return [];
    if(this.type === 'seerah') return this.data.seerah || [];
    if(this.type === 'prophets') return this.data.prophets || [];
    if(this.type === 'hisn') return this.data.hisn || [];
    return this.data.events || [];
  },
  itemTitle(item){ return item.title || 'محتوى للقراءة'; },
  itemText(item){ return item.text || ''; },
  todayKeys(){
    const now = new Date();
    const g = String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    let h = '';
    try{
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{day:'2-digit',month:'2-digit'}).formatToParts(now);
      const day = parts.find(x=>x.type==='day')?.value;
      const month = parts.find(x=>x.type==='month')?.value;
      const monthMap = {'Muharram':'01','Safar':'02','Rabiʻ I':'03','Rabiʻ II':'04','Jumada I':'05','Jumada II':'06','Rajab':'07','Shaʻban':'08','Ramadan':'09','Shawwal':'10','Dhuʻl-Qiʻdah':'11','Dhuʻl-Hijjah':'12'};
      if(day && month) h = String(Number(month)).padStart(2,'0')+'-'+String(Number(day)).padStart(2,'0');
    }catch(e){}
    return {g,h};
  },
  getTodayEvents(){
    const keys = this.todayKeys();
    const events = (this.data?.events || []).filter(e => {
      if(!e.date) return false;
      return e.calendar === 'هجري' ? e.date === keys.h : e.date === keys.g;
    });
    return events;
  },
  render(){
    const box = document.getElementById('islamicContent');
    if(!box || !this.data) return;
    const q = (document.getElementById('islamicSearch')?.value || '').trim().toLocaleLowerCase('ar');
    let arr = this.sourceList();
    if(this.type === 'events'){
      const today = this.getTodayEvents();
      const featured = today.map(e => ({...e, _today:true}));
      const rest = arr.filter(e => !today.includes(e));
      arr = featured.concat(rest);
    }
    this.list = arr;
    this.filtered = arr.filter(item => !q || [item.title,item.subtitle,item.period,item.text,item.category,item.year,item.refs].join(' ').toLocaleLowerCase('ar').includes(q));
    const counts = {seerah:this.data.seerah.length, prophets:this.data.prophets.length, hisn:this.data.hisn.length, events:this.data.events.length};
    const todayCount = this.type === 'events' ? this.getTodayEvents().length : 0;
    let html = `<div class="islamic-summary"><span>${this.titleFor(this.type)}</span><span>${this.filtered.length} مادة</span></div>`;
    if(this.type === 'events') html += `<div class="islamic-notice">${todayCount ? `عُثر على ${todayCount} حدث/مناسبة مرتبط بتاريخ اليوم بحسب التقويم المتاح.` : 'لا توجد في قاعدة البيانات الحالية واقعة موثقة تطابق اليوم بدقة؛ يمكنك تصفح جميع الأحداث أدناه.'} التواريخ المختلف فيها موضحة داخل كل بطاقة. المحتوى المحلي يضم ${this.data.events.length} بطاقة تاريخية قابلة للتوسعة.</div>`;
    if(this.type === 'hisn') html += '<div class="islamic-notice">مجموعة موسعة من الأذكار والأدعية مع مراجعها، وليست ادعاءً بأنها النسخة الكاملة الحرفية من كتاب حصن المسلم. يُرجى مراجعة درجة الرواية حيث وُضّحت.</div>';
    if(this.type === 'seerah') html += '<div class="islamic-notice">سيرة مقسمة إلى فصول للقراءة المتتابعة، مع مصادر وتنبيهات عند اختلاف الروايات والتواريخ.</div>';
    if(this.type === 'prophets') html += '<div class="islamic-notice">قصص الأنبياء الخمسة والعشرين المذكورين في القرآن ضمن فصول قراءة، مع الاقتصار على الثابت والتنبيه إلى محدودية التفاصيل حيث لم يرد نص.</div>';
    if(!this.filtered.length) html += '<div class="card">لا توجد نتائج مطابقة. جرّب كلمة أخرى.</div>';
    this.filtered.forEach((item,i) => {
      const meta = [item.period,item.subtitle,item.year,item.category,item.date ? (item.calendar==='هجري'?'هجري ':'')+item.date : ''].filter(Boolean).join(' · ');
      const preview = this.itemText(item).slice(0,190);
      const badge = item._today ? '<span class="islamic-today-badge">حدث اليوم</span>' : '';
      html += `<button class="islamic-entry" data-focus data-islamic-index="${i}" onclick="IslamicSections.openReader(${i})"><span class="islamic-entry-icon">${this.type==='seerah'?'ﷺ':this.type==='prophets'?'📖':this.type==='hisn'?'🤲':'📜'}</span><span class="islamic-entry-body"><strong>${this.escape(this.itemTitle(item))}</strong><small>${this.escape(meta)}</small><span>${this.escape(preview)}${preview.length>=190?'…':''}</span>${badge}</span><span class="islamic-entry-arrow">‹</span></button>`;
    });
    box.innerHTML = html;
  },
  escape(s){ return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  openReader(i){
    const item = this.filtered[i]; if(!item) return;
    this.index = i;
    this.readerType = this.type;
    this.renderReader(item);
    const overlay = document.getElementById('islamicReaderOverlay');
    overlay.classList.remove('hidden');
    document.body.classList.add('islamic-reading-open');
    try { if(Focus?.enabled) { Focus.current = null; Focus.reset(); } } catch(e){}
  },
  renderReader(item){
    const title = document.getElementById('islamicReaderTitle');
    const meta = document.getElementById('islamicReaderMeta');
    const body = document.getElementById('islamicReaderBody');
    if(title) title.textContent = this.itemTitle(item);
    if(meta) meta.textContent = [item.period,item.subtitle,item.year,item.category,item.source].filter(Boolean).join(' · ');
    if(body){
      const paragraphs = [item.text || '', item.details || ''].filter(Boolean).flatMap(t=>t.split(/\n\s*\n/).filter(Boolean));
      body.innerHTML = paragraphs.map(p=>`<p>${this.escape(p)}</p>`).join('');
      if(item.refs) body.innerHTML += `<div class="islamic-reference"><strong>المصدر / المراجع</strong><p>${this.escape(item.refs)}</p></div>`;
      if(item.dateNote) body.innerHTML += `<div class="islamic-reference"><strong>تنبيه تاريخي</strong><p>${this.escape(item.dateNote)}</p></div>`;
      if(item.count) body.innerHTML += `<div class="islamic-reference"><strong>عدد التكرار المقترح</strong><p>${item.count} ${item.count===1?'مرة':'مرة'} — لا تُعامل الأعداد إلا حيث ثبتت في المصدر.</p><button class="islamic-count-btn" data-focus onclick="IslamicSections.countDhikr(${item.count})">ابدأ العدّ <span id="islamicDhikrCounter">0</span> / ${item.count}</button></div>`;
      body.style.fontSize = this.fontSize+'px';
    }
    const saved = this.getSaved(this.readerType);
    const key = this.itemKey(item);
    const saveBtn = document.getElementById('islamicSaveBtn');
    if(saveBtn) saveBtn.textContent = saved === key ? '🔖 محفوظ' : '🔖 حفظ الموضع';
    const pos = document.getElementById('islamicReaderPosition');
    if(pos) pos.textContent = `${this.index+1} / ${this.filtered.length}`;
  },
  itemKey(item){ return String(item.title || '') + '|' + String(item.year || item.period || item.subtitle || ''); },
  getSaved(type){ try{return localStorage.getItem('khushue.reader.'+type)||'';}catch(e){return '';} },
  savePosition(){
    const item = this.filtered[this.index]; if(!item) return;
    try { localStorage.setItem('khushue.reader.'+this.readerType,this.itemKey(item)); } catch(e){}
    const b=document.getElementById('islamicSaveBtn'); if(b) b.textContent='🔖 محفوظ';
    if(typeof toast==='function') toast('تم حفظ موضع القراءة على هذا الجهاز');
  },
  openSaved(){
    const key=this.getSaved(this.type);
    if(!key){ if(typeof toast==='function') toast('لا يوجد موضع محفوظ لهذا القسم بعد'); return; }
    const idx=this.filtered.findIndex(x=>this.itemKey(x)===key);
    if(idx<0){ if(typeof toast==='function') toast('الموضع المحفوظ غير موجود ضمن النتائج الحالية؛ أزل البحث أولًا'); return; }
    this.openReader(idx);
  },
  prev(){ if(this.index>0){this.index--;this.renderReader(this.filtered[this.index]);} },
  next(){ if(this.index<this.filtered.length-1){this.index++;this.renderReader(this.filtered[this.index]);} },
  changeFont(delta){this.fontSize=Math.max(16,Math.min(34,this.fontSize+delta));const b=document.getElementById('islamicReaderBody');if(b)b.style.fontSize=this.fontSize+'px';},
  closeReader(){const o=document.getElementById('islamicReaderOverlay');if(o)o.classList.add('hidden');document.body.classList.remove('islamic-reading-open');},
  countDhikr(target){const el=document.getElementById('islamicDhikrCounter');if(!el)return;let n=Number(el.textContent||0);if(n<target)n++;el.textContent=n;if(n>=target&&typeof toast==='function')toast('أتممت العدّ');},
  search(){this.render();},
  resumeToday(){this.setType('events'); const e=this.getTodayEvents(); if(e.length){const idx=this.filtered.findIndex(x=>this.itemKey(x)===this.itemKey(e[0])); if(idx>=0)this.openReader(idx);} else if(typeof toast==='function')toast('لا يوجد حدث مؤرخ بدقة لهذا اليوم؛ تصفح الموسوعة الكاملة.');}
};
