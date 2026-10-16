const QRShare = {
  getAppUrl(){
    return 'https://github.com/aekadam7-commits/khushue-app/releases/latest/download/khushue.apk';
  },
  
  async shareApp(){
    const url = this.getAppUrl();
    
    const shareData = {
      title: 'خُشوع',
      text: 'تحميل تطبيق خُشوع',
      url: url
    };
    
    try{
      if(navigator.share){
        await navigator.share(shareData);
        return;
      }
    } catch(e){
      if(e.name === 'AbortError') return;
    }
    
    try{
      if(navigator.clipboard){
        await navigator.clipboard.writeText(url);
        toast('✅ تم نسخ الرابط');
        return;
      }
    } catch(e){}
    
    toast('❌ تعذر المشاركة');
  },
  
  showQR(){
    const url = this.getAppUrl();
    
    const html = 
      '<h3>📱 تحميل تطبيق خُشوع</h3>' +
      '<div id="qrWrap" class="qr-wrap"></div>' +
      '<div class="qr-url">' + url + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
        '<button class="btn-secondary" data-focus onclick="QRShare.shareApp();App.closeModal()" ' +
          'style="flex:1">📤 مشاركة</button>' +
        '<button class="btn-secondary" data-focus onclick="QRShare.copyUrl()" ' +
          'style="flex:1">📋 نسخ</button>' +
      '</div>' +
      '<button class="btn-secondary" data-focus onclick="App.closeModal()" ' +
        'style="width:100%;margin-top:8px">إغلاق</button>';
    
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    
    setTimeout(() => this.generateQR(url), 100);
    
    if(Focus.enabled) setTimeout(() => Focus.reset(), 200);
  },
  
  generateQR(url){
    const wrap = document.getElementById('qrWrap');
    if(!wrap) return;
    
    // رمز QR يُولَّد محلياً (مكتبة qrcode-generator) دون إنترنت
    try{
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      
      wrap.innerHTML = 
        '<a href="' + url + '" target="_blank" rel="noopener" ' +
          'style="display:inline-block;padding:14px;background:#fff;border-radius:16px;' +
          'box-shadow:0 4px 20px rgba(0,0,0,.15)">' +
          qr.createImgTag(6, 0) +
        '</a>';
      
      const img = wrap.querySelector('img');
      if(img){
        img.style.cssText = 'width:240px;height:240px;display:block;border-radius:8px;image-rendering:pixelated';
      }
    } catch(e){
      wrap.innerHTML = '<div class="text-muted" style="font-size:12px">تعذر إنشاء الرمز — انسخ الرابط أدناه</div>';
    }
  },
  
  async copyUrl(){
    const url = this.getAppUrl();
    
    try{
      if(navigator.clipboard){
        await navigator.clipboard.writeText(url);
        toast('✅ تم نسخ الرابط');
        return;
      }
    } catch(e){}
    
    toast('❌ تعذر النسخ');
  }
};
