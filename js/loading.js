const Loading = {
  show(container, text){
    if(!container) return;
    text = text || 'جارٍ التحميل...';
    container.innerHTML = `
      <div class="loading-overlay">
        <div class="loader loader-lg"></div>
        <div class="loading-text">${text}</div>
      </div>
    `;
  },
  
  hide(container){
    if(!container) return;
    const overlay = container.querySelector('.loading-overlay');
    if(overlay) overlay.remove();
  },
  
  empty(container, title, text){
    if(!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">🔍</div>
        <div class="empty-title">${title || 'لا توجد نتائج'}</div>
      </div>
    `;
  },
  
  error(container, message, retryCallback){
    if(!container) return;
    message = message || 'فشل التحميل';
    
    const wrap = document.createElement('div');
    wrap.className = 'empty-state';
    wrap.innerHTML = `
      <div class="empty-ico">⚠️</div>
      <div class="empty-title">خطأ</div>
      <div class="empty-text">${message}</div>
      <button class="retry-btn" type="button">
        🔄 إعادة المحاولة
      </button>
    `;
    
    if(retryCallback){
      wrap.querySelector('.retry-btn').addEventListener('click', retryCallback);
    }
    
    container.innerHTML = '';
    container.appendChild(wrap);
  },
  
  async fetchJSON(url, options, retries){
    if(retries === undefined) retries = 2;
    
    for(let i = 0; i <= retries; i++){
      try{
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 15000);
        
        const res = await fetch(url, {
          ...(options || {}),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if(!res.ok) throw new Error('HTTP ' + res.status);
        
        const data = await res.json();
        return { ok:true, data };
      } catch(err){
        if(i === retries){
          return { ok:false, error: err.message };
        }
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    
    return { ok:false, error:'فشل الاتصال' };
  },
  
  async fetchText(url, retries){
    if(retries === undefined) retries = 2;
    
    for(let i = 0; i <= retries; i++){
      try{
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 15000);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        
        if(!res.ok) throw new Error('HTTP ' + res.status);
        
        const text = await res.text();
        return { ok:true, text };
      } catch(err){
        if(i === retries){
          return { ok:false, error: err.message };
        }
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    
    return { ok:false, error:'فشل الاتصال' };
  },
  
  spinnerSmall(){
    return '<div class="loader" style="width:24px;height:24px;border-width:2px;display:inline-block;vertical-align:middle"></div>';
  },
  
  isOnline(){
    return navigator.onLine !== false;
  },
  
  offline(container){
    if(!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">📡</div>
        <div class="empty-title">لا يوجد اتصال بالإنترنت</div>
      </div>
    `;
  }
};
