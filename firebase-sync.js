(function(){
  let db,docRef,lastSerialized='',applyingRemote=false,started=false;
  const PUBLISH_URL='https://us-central1-polygon-app-e7c11.cloudfunctions.net/publishPolygons';
  function notify(msg){try{if(typeof toast==='function')toast(msg)}catch(e){}}
  function sectorPayload(){const out={};Object.entries(sectors).forEach(([k,s])=>{out[k]={l:s.l,n:s.n,c:s.c,p:Array.isArray(s.p)?s.p:[],x:Array.isArray(s.x)?s.x:[]};});return out;}
  function applyCloud(data){if(!data||!data.sectors)return;applyingRemote=true;try{Object.entries(data.sectors).forEach(([k,v])=>{if(!sectors[k])sectors[k]={};sectors[k].l=v.l||sectors[k].l||k;sectors[k].n=v.n||sectors[k].n||`גזרה ${sectors[k].l}`;sectors[k].c=v.c||sectors[k].c||'#64748b';sectors[k].p=Array.isArray(v.p)?v.p:[];sectors[k].x=Array.isArray(v.x)?v.x:[];if(polys[k]&&sectors[k].x.length){polys[k].setLatLngs(sectors[k].x);polys[k].setStyle(style(sectors[k],k===current));}if(labels[k]&&sectors[k].x.length){labels[k].setLatLng(center(sectors[k].x));}});if(typeof renderPickList==='function')renderPickList();if(typeof applyVisibility==='function')applyVisibility();if(typeof highlight==='function')highlight();lastSerialized=JSON.stringify(sectorPayload());localStorage.setItem('polygon-cloud-cache-v1',lastSerialized);window.__polygonCloudVersion=data.version||0;}finally{applyingRemote=false;}}
  async function publish(){
    const code=sessionStorage.getItem('polygonEditorCode')||'';
    if(!code){notify('יש להיכנס לעריכת פוליגונים מחדש');return false;}
    try{
      const payload=sectorPayload();
      const r=await fetch(PUBLISH_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Code':code},body:JSON.stringify({sectors:payload})});
      if(!r.ok){if(r.status===401){sessionStorage.removeItem('polygonEditorUnlocked');sessionStorage.removeItem('polygonEditorCode');notify('הרשאת העריכה פגה');}else notify('השמירה לענן נכשלה');return false;}
      const result=await r.json().catch(()=>({}));
      lastSerialized=JSON.stringify(payload);
      localStorage.setItem('polygon-cloud-cache-v1',lastSerialized);
      window.__polygonCloudVersion=result.version||Date.now();
      notify('השינויים נשמרו ופורסמו לכולם');
      return true;
    }catch(err){console.error('Cloud publish failed',err);notify('אין חיבור לשרת השמירה');return false;}
  }
  window.publishPolygonsToCloud=publish;
  function installAdminHook(){const submit=document.getElementById('passwordSubmit'),input=document.getElementById('passwordInput');if(submit&&input){submit.addEventListener('click',()=>{if(input.value==='66'){sessionStorage.setItem('polygonEditorUnlocked','1');sessionStorage.setItem('polygonEditorCode',input.value);}});input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.value==='66'){sessionStorage.setItem('polygonEditorUnlocked','1');sessionStorage.setItem('polygonEditorCode',input.value);}});}}
  function watchLocalChanges(){setInterval(()=>{if(applyingRemote||sessionStorage.getItem('polygonEditorUnlocked')!=='1')return;let now;try{now=JSON.stringify(sectorPayload())}catch(e){return}if(lastSerialized&&now!==lastSerialized){clearTimeout(window.__polygonCloudSaveTimer);window.__polygonCloudSaveTimer=setTimeout(publish,700);}},700);}
  function start(){if(started)return;started=true;try{if(!window.firebase||!window.firebaseConfig)throw new Error('Firebase config missing');firebase.initializeApp(window.firebaseConfig);db=firebase.firestore();docRef=db.collection('maps').doc('nazareth');const cached=localStorage.getItem('polygon-cloud-cache-v1');if(cached){try{applyCloud({sectors:JSON.parse(cached)})}catch(e){}}lastSerialized=JSON.stringify(sectorPayload());docRef.onSnapshot(s=>{if(s.exists)applyCloud(s.data());},err=>{console.error('Firestore snapshot failed',err);notify('לא ניתן לטעון פוליגונים מהענן');});installAdminHook();watchLocalChanges();window.dispatchEvent(new CustomEvent('polygon-cloud-ready'));}catch(err){console.error('Firebase init failed',err);notify('חיבור Firebase נכשל');}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
