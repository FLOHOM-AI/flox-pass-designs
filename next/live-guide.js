/* FLOx live guidebook (2026-10-08): the REAL Digital Guidebook for the FLOHOM being viewed, fetched
   live from Bridge for signed-in Bridge owners. Everyone else keeps the sample guidebook.
   Nothing real is stored in this file or on the public site: it only holds public listing names.
   Bridge route: GET https://app.flohom.com/api/admin/flox-designs/guidebook?property=N (owner-only,
   CORS to exactly https://designs.flohom.com, Wi-Fi + codes locked even for owners, text + vetted photo URLs).
   The HTML is sanitized again here with DOMPurify (pinned + SRI) before it touches the page.
   Shared: build_ten.py inlines it ahead of core.js; the film page loads ../live-guide.js. */
(function(){
'use strict';
const API='https://app.flohom.com/api/admin/flox-designs/guidebook?property=';
const SIGNIN='https://app.flohom.com/admin/login';
const PURIFY={src:'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.4.16/purify.min.js',
  sri:'sha512-flQmhkXNRQ3iUfvtdCobtpMjCb6kE+zLnTiAulAQJ3WykVfy84JvCMOo6vhwWXHTXjR25h9Zj+LyGFRWKjRoag=='};
/* Public listing names (flohom.com), so the picker works signed out too. Bridge's answer wins when signed in. */
const HOMES={1:'Bay Escape',2:'Modern Charm',3:'Bung-a-flo',4:'FLOTOMAC',5:'Amanzi',6:'Closing Tide',7:'Harbor Hideaway',8:'Victoria Mae',
  9:'Baldamore Oasis',10:'Rudee Retreat',11:'Rudee Awakening',12:'Azirae So-Lay',13:'Port Noir',14:'Soteria',15:'Palmera',16:"Isaac's Way",17:'Selah Sailor'};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');

function startN(){ let n=1; try{ n=parseInt(new URLSearchParams(location.search).get('flohom')||'1',10); }catch(e){} return HOMES[n]?n:1; }
const st={n:startN(), status:{}, data:{}};
const subs=[]; const notify=()=>subs.forEach(f=>{ try{ f(st.n); }catch(e){ console.error(e); } });

/* Facts the designs show for the chosen FLOHOM. Live values when Bridge answered, public names otherwise. */
function home(n=st.n){ const d=st.data[n]&&st.data[n].property; const nick=(d&&d.nickname)||HOMES[n];
  return { number:n, name:`FLOHOM ${n}`, nick, bookUrl:(d&&d.bookUrl)||`https://flohom.com/property/flohom-${pad(n)}`,
    reviewUrl:`https://flohom.link/FLOHOM-${n}-Review`, city:(d&&d.city)||null }; }

let purifyP=null;
function purify(){ if(window.DOMPurify) return Promise.resolve(window.DOMPurify);
  return purifyP||(purifyP=new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=PURIFY.src; s.integrity=PURIFY.sri; s.crossOrigin='anonymous';
    s.referrerPolicy='no-referrer'; s.onload=()=>window.DOMPurify?ok(window.DOMPurify):no(new Error('DOMPurify missing')); s.onerror=()=>{ purifyP=null; no(new Error('DOMPurify blocked')); }; document.head.appendChild(s); })); }

/* Ask Bridge once per FLOHOM. 200 → real guides; 401 / 403 / network / CORS block → sample stays. */
function ensure(n=st.n){ if(st.status[n]) return; st.status[n]='loading';
  Promise.all([purify(), fetch(API+n,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}})])
    .then(async([P,r])=>{ if(!r.ok){ st.status[n]=r.status===401||r.status===403?'signedout':'error'; return; }
      const j=await r.json(); st.data[n]=prepare(j,P); st.status[n]='ok'; })
    .catch(()=>{ st.status[n]='error'; })
    .finally(notify); }

const ALLOWED={ALLOWED_TAGS:['p','br','b','strong','i','em','u','ul','ol','li','a'],ALLOWED_ATTR:['href','rel','target'],ALLOWED_URI_REGEXP:/^https:\/\//i};
/* Photos (2026-10-08, Pray GO B): Bridge already vets them (https, approved hosts, never from a guide holding a
   code or Wi-Fi detail). Checked again here: same host list, https only, escaped, lazy, no referrer. The whole guide
   body then goes through DOMPurify once more with <img src=https> as the only addition to the text whitelist. */
const IMG_OK=/^https:\/\/(resources-prod-attachmentsbucket-cxcbr2w0gb7i\.s3\.amazonaws\.com|lh3\.googleusercontent\.com|d3ciwvs59ifrt8\.cloudfront\.net|img1\.wsimg\.com|app\.flohom\.com\/seed-images)\//;
const okImg=s=>typeof s==='string'&&IMG_OK.test(s)&&!/["'<>\s]/.test(s)?s:null;
const imgTag=(src,alt,cls)=>okImg(src)?`<img class="${cls}" src="${esc(src)}" alt="${esc(alt||'')}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:'';
const BODY={ALLOWED_TAGS:[...ALLOWED.ALLOWED_TAGS,'div','small','span','img','figure','figcaption'],
  ALLOWED_ATTR:['href','rel','target','class','src','alt','loading','decoding','referrerpolicy'],ALLOWED_URI_REGEXP:/^https:\/\//i};
function prepare(j,P){
  /* Each block keeps its own shape (designs that lay photos out their own way read g.blocks) and a ready-made HTML form. */
  const shape=b=>{
    if(b&&b.kind==='text'){ const html=P.sanitize(String(b.html||''),ALLOWED); return html.trim()?{kind:'text',html}:null; }
    if(b&&b.kind==='header') return {kind:'header',text:String(b.text||'')};
    if(b&&b.kind==='place') return {kind:'place',name:String(b.name||''),miles:typeof b.miles==='number'?b.miles:null,address:b.address?String(b.address):null,description:b.description?String(b.description):null,image:okImg(b.image)};
    if(b&&b.kind==='image'&&okImg(b.src)) return {kind:'image',src:b.src,caption:b.caption?String(b.caption):null};
    return null; };
  const html=b=>b.kind==='text'?`<div class="fx-gb-text">${b.html}</div>`
    :b.kind==='header'?`<p class="fx-gb-hd"><b>${esc(b.text)}</b></p>`
    :b.kind==='image'?`<figure class="fx-gb-fig">${imgTag(b.src,b.caption,'fx-gb-img')}${b.caption?`<figcaption>${esc(b.caption)}</figcaption>`:''}</figure>`
    :`<div class="fx-gb-place${b.image?' fx-has-img':''}">${b.image?imgTag(b.image,b.name,'fx-gb-pimg'):''}<div><b>${esc(b.name)}</b>${b.miles!=null?`<span class="fx-gb-mi">${esc(b.miles)} mi away</span>`:''}${b.address?`<small>${esc(b.address)}</small>`:''}${b.description?`<p>${esc(b.description)}</p>`:''}</div></div>`;
  const guide=g=>{ const blocks=(g.blocks||[]).map(shape).filter(Boolean);
    return {title:String(g.title||''), cover:okImg(g.cover), blocks, body:P.sanitize(blocks.map(html).join(''),BODY),
      photos:blocks.reduce((a,b)=>a+(b.kind==='image'||b.image?1:0),0)}; };
  const p=j.property||{};
  return { property:{nickname:p.nickname?String(p.nickname):null, city:p.city?String(p.city):null,
      bookUrl:typeof p.bookUrl==='string'&&/^https:\/\/flohom\.com\//.test(p.bookUrl)?p.bookUrl:null},
    groups:[{key:'o',label:'Your FLOHOM',guides:(j.operational||[]).map(guide)},
            {key:'v',label:`${p.city?String(p.city)+' ':''}Voyager Guide`,guides:(j.voyager||[]).map(guide)}].filter(g=>g.guides.length) }; }

function setHome(n){ n=parseInt(n,10); if(!HOMES[n]||n===st.n) return; st.n=n;
  try{ const u=new URL(location.href); u.searchParams.set('flohom',n); history.replaceState(null,'',u); }catch(e){}
  notify(); }

/* One state for the designs: 'loading' | 'ok' | 'signedout' | 'error'. */
function view(n=st.n){ ensure(n); return { status:st.status[n], data:st.data[n]||null }; }
const signinLine=n=>`Sign in to Bridge to see FLOHOM ${n}'s real guidebook. <a href="${SIGNIN}" target="_blank" rel="noopener">Sign in</a>`;

window.FXLive={ get n(){ return st.n; }, HOMES, home, view, setHome, signinLine, esc, on:f=>subs.push(f) };
})();
