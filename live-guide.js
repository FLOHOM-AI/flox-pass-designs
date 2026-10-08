/* FLOx live guidebook (2026-10-08): the REAL Digital Guidebook for the FLOHOM being viewed, fetched
   live from Bridge for signed-in Bridge owners. Everyone else keeps the sample guidebook.
   Nothing real is stored in this file or on the public site: it only holds public listing names.
   Bridge route: GET https://app.flohom.com/api/admin/flox-designs/guidebook?property=N (owner-only,
   CORS to exactly https://designs.flohom.com, Wi-Fi + codes locked even for owners, text only).
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
function prepare(j,P){ const block=b=>{
    if(b&&b.kind==='text'){ const html=P.sanitize(String(b.html||''),ALLOWED); return html.trim()?`<div class="fx-gb-text">${html}</div>`:''; }
    if(b&&b.kind==='header') return `<p class="fx-gb-hd"><b>${esc(b.text)}</b></p>`;
    if(b&&b.kind==='place') return `<div class="fx-gb-place"><b>${esc(b.name)}</b>${typeof b.miles==='number'?`<span class="fx-gb-mi">${esc(b.miles)} mi away</span>`:''}${b.address?`<small>${esc(b.address)}</small>`:''}${b.description?`<p>${esc(b.description)}</p>`:''}</div>`;
    return ''; };
  const guide=g=>({title:String(g.title||''), body:(g.blocks||[]).map(block).join('')});
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
