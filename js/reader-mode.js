/* وضع القراءة بملء الشاشة للكتب والمصحف — يعمل باللمس والريموت */
const ReaderMode = {
  kind: null, index: 0, items: [], title: '',
  init(){
    if(document.getElementById('readerOverlay')) return;
    const el=document.createElement('div');
    el.id='readerOverlay'; el.className='reader-overlay hidden'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','وضع القراءة');
    el.innerHTML=`<header class="reader-toolbar"><button data-focus class="reader-action" onclick="ReaderMode.close()" aria-label="إغلاق وضع القراءة">✕ خروج</button><strong id="readerTitle">وضع القراءة</strong><div class="reader-tools"><button data-focus class="reader-action" onclick="ReaderMode.changeFont(-2)" aria-label="تصغير الخط">A−</button><button data-focus class="reader-action" onclick="ReaderMode.changeFont(2)" aria-label="تكبير الخط">A+</button><button data-focus class="reader-action" onclick="ReaderMode.save()">🔖 حفظ الصفحة</button></div></header><main id="readerContent" class="reader-content" tabindex="0"></main><footer class="reader-navigation"><button data-focus class="reader-nav" onclick="ReaderMode.prev()">‹ السابق</button><span id="readerPosition">—</span><button data-focus class="reader-nav" onclick="ReaderMode.next()">التالي ›</button></footer>`;
    document.body.appendChild(el);
    document.addEventListener('keydown',e=>{if(!this.isOpen())return;if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();this.close();}else if(e.key==='ArrowLeft')this.next();else if(e.key==='ArrowRight')this.prev();});
  },
  isOpen(){const e=document.getElementById('readerOverlay');return !!e&&!e.classList.contains('hidden');},
  openCollection(kind,index){
    this.init(); this.kind=kind; this.items=kind==='seerah'?IslamicLibrary.events.map((x,i)=>({id:'seerah-'+i,title:x[0],body:`<p>${IslamicLibrary.escape(x[1])}</p><p class="reader-source">📍 ${IslamicLibrary.escape(x[2])}</p>`})):IslamicLibrary.items.map((x,i)=>({id:'dua-'+i,title:x.title,body:`<p class="reader-arabic">${IslamicLibrary.escape(x.text)}</p><p class="reader-source">المصدر: ${IslamicLibrary.escape(x.source)}</p>`}));
    const saved=Store.get('readerBookmark',null);if(index==null&&saved&&saved.kind===kind)index=saved.index;
    this.index=Math.max(0,Math.min(this.items.length-1,Number(index)||0));this.renderCollection();this.show();
  },
  renderCollection(){const item=this.items[this.index];if(!item)return;document.getElementById('readerTitle').textContent=item.title;document.getElementById('readerContent').innerHTML=`<article class="reader-page"><h2>${IslamicLibrary.escape(item.title)}</h2>${item.body}</article>`;document.getElementById('readerPosition').textContent=`${this.index+1} / ${this.items.length}`;},
  openMushaf(){this.init();this.kind='mushaf';this.show();this.syncMushaf();},
  syncMushaf(){if(!this.isOpen()||this.kind!=='mushaf')return;const source=document.getElementById('mushafView');if(source)document.getElementById('readerContent').innerHTML=source.innerHTML;document.getElementById('readerTitle').textContent='المصحف الشريف';document.getElementById('readerPosition').textContent=`الصفحة ${Mushaf.currentPage} / ${Mushaf.totalPages}`;},
  show(){document.getElementById('readerOverlay').classList.remove('hidden');document.body.classList.add('reader-mode-active');document.getElementById('readerContent').scrollTop=0;setTimeout(()=>{const b=document.querySelector('#readerOverlay button');if(b)b.focus({preventScroll:true});},40);},
  close(){const e=document.getElementById('readerOverlay');if(!e)return;e.classList.add('hidden');document.body.classList.remove('reader-mode-active');if(Focus&&Focus.enabled){Focus.current=null;Focus.reset();}},
  prev(){if(this.kind==='mushaf'){Mushaf.prev();return;}if(this.index>0){this.index--;this.renderCollection();document.getElementById('readerContent').scrollTop=0;}},
  next(){if(this.kind==='mushaf'){Mushaf.next();return;}if(this.index<this.items.length-1){this.index++;this.renderCollection();document.getElementById('readerContent').scrollTop=0;}},
  save(){if(this.kind==='mushaf'){Bookmark.saveMushaf(Mushaf.currentPage);Store.set('readerBookmark',{kind:'mushaf',index:Mushaf.currentPage-1,page:Mushaf.currentPage});toast('تم حفظ موضع المصحف: الصفحة '+Mushaf.currentPage);return;}const item=this.items[this.index];Store.set('readerBookmark',{kind:this.kind,index:this.index,id:item&&item.id});toast('تم حفظ موضع القراءة');},
  continueSaved(){const b=Store.get('readerBookmark',null);if(!b){toast('لا يوجد موضع قراءة محفوظ');return;}if(b.kind==='mushaf'){App.go('mushaf');Mushaf.load(b.page||1).then(()=>this.openMushaf());}else this.openCollection(b.kind,b.index);},
  changeFont(delta){if(this.kind==='mushaf'){Mushaf.setFontSize(Math.max(18,Math.min(42,Mushaf.fontSize+delta)));this.syncMushaf();return;}const el=document.getElementById('readerContent');const cur=parseFloat(getComputedStyle(el).fontSize)||20;el.style.fontSize=Math.max(15,Math.min(38,cur+delta))+'px';}
};
document.addEventListener('DOMContentLoaded',()=>ReaderMode.init());
