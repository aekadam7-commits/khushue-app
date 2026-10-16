/* ============================================================
   خُشوع — tasbih.js
   المسبحة الإلكترونية
   ============================================================ */

const Tasbih = {
  count: 0,
  target: 33,
  idx: 0,
  list: [
    'سُبْحَانَ اللَّهِ',
    'الْحَمْدُ لِلَّهِ',
    'اللَّهُ أَكْبَرُ',
    'لَا إِلَهَ إِلَّا اللَّهُ',
    'أَسْتَغْفِرُ اللَّهَ'
  ],
  
  init(){
    this.count = Store.get('tasbihCount', 0);
    this.idx = Store.get('tasbihIdx', 0);
    this.render();
  },
  
  tap(){
    this.count++;
    vib(20);
    Store.set('tasbihCount', this.count);
    this.render();
    
    if(this.count === this.target){
      vib([100, 50, 100]);
      toast('✅ تقبل الله');
    }
  },
  
  reset(){
    this.count = 0;
    Store.set('tasbihCount', 0);
    this.render();
  },
  
  changeDhikr(){
    this.idx = (this.idx + 1) % this.list.length;
    Store.set('tasbihIdx', this.idx);
    this.count = 0;
    Store.set('tasbihCount', 0);
    this.render();
  },
  
  render(){
    const c = document.getElementById('tasbihCount');
    if(c) c.textContent = this.count;
    
    const t = document.getElementById('tasbihTarget');
    if(t) t.textContent = 'الهدف: ' + this.target;
    
    const d = document.getElementById('tasbihDhikr');
    if(d) d.textContent = this.list[this.idx];
  }
};
