/* ============================================================
   خُشوع — names99.js
   أسماء الله الحسنى (99)
   ============================================================ */

const Names99 = {
  init(){
    const box = document.getElementById('namesGrid');
    if(!box) return;
    box.innerHTML = '';
    
    NAMES99.forEach((n, i) => {
      const d = document.createElement('div');
      d.className = 'name-card';
      d.setAttribute('data-focus', '');
      
      d.onclick = () => toast(n[1]);
      
      d.innerHTML = 
        '<div class="name-num">' + (i + 1) + '</div>' +
        '<div class="name-ar">' + n[0] + '</div>' +
        '<div class="name-mean">' + n[1] + '</div>';
      
      box.appendChild(d);
    });
  }
};
