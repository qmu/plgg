import { type SoftStr } from "plgg";
import {
  stripAttr,
  columnAttr,
  spanAttr,
  navHookName,
  partnersMeta,
  embeddersMeta,
  embedParam,
  embeddedAttr,
  frameClass,
  frameReadyAttr,
} from "plggmatic/Navigate/model/marker";
import {
  foldClass,
  trailClass,
  leavingAttr,
  replacingAttr,
  openedAttr,
} from "plggmatic/Meta/model/classHooks";
import {
  restParam,
  spanParam,
  entrySeparator,
  fieldSeparator,
  escapeChar,
} from "plggmatic/Navigate/usecase/compositionUrl";

// plggmatic's SECOND browser runtime, built to the shape
// of its first (`appearanceInitScript`): one dependency-
// free inline string constant, injected into SSR output,
// with no bundler, no npm dependency and no build step of
// its own. Every literal it needs is sourced through
// `JSON.stringify` of an exported constant, so a rename in
// the model propagates here instead of rotting (the same
// D16 rule the appearance wiring script follows).
//
// WHAT IT DOES. A column is OPENED rather than
// re-rendered-from-nothing: fetch the target route's own
// server-rendered page, take the element carrying
// `columnAttr`, and place it in the element carrying
// `stripAttr`. Sound because a document column renders
// identically wherever it sits in a strip — a clicked
// column and a reloaded column are the same markup.
//
// WHAT IT NEVER DOES. It never leaves the reader without a
// page: a non-OK fetch, a missing marker, or any throw
// falls back to a real navigation to the composition URL,
// which the server renders. The enhancement may fail; the
// content may not.
//
// WHY THE DECISIONS LIVE IN THE SCRIPT. An inline runtime
// cannot import TypeScript, so any "pure decision module"
// beside it would be a SECOND implementation of the same
// rules — the drift this mission exists to remove. Instead
// the script publishes its own decisions on the hook
// (`urlFor`, `entries`), so they are driven and asserted
// in a real browser rather than re-derived offline.

const q = (value: SoftStr): SoftStr =>
  JSON.stringify(value);

/**
 * The inline navigation runtime. Contains no `</script`
 * inner sequence, and is injected AFTER the SSR escaper
 * so its `<`/`>` are literal markup.
 */
export const navigationInitScript: SoftStr =
  "(function(){" +
  `var S=${q(stripAttr)},C=${q(columnAttr)},P=${q(
    spanAttr,
  )};` +
  `var FC=${q(foldClass)},TC=${q(trailClass)};` +
  `var LV=${q(leavingAttr)},RP=${q(replacingAttr)},OP=${q(openedAttr)};` +
  // an opened column glides into view unless the reader
  // asked for less motion
  "var R0=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;" +
  `var R=${q(restParam)},Q=${q(spanParam)};` +
  `var E=${q(escapeChar)},N=${q(
    entrySeparator,
  )},F=${q(fieldSeparator)};` +
  // COLUMNS ACROSS SITES. The sites this page opens as
  // columns (partners) and the sites it lets open it as one
  // (embedders) are exact origins named in the head. A
  // partner's page is only ever shown in a frame of its
  // own — never fetched, never placed in this document —
  // and what a frame says is believed only when it comes
  // from the partner that frame was opened for.
  `var PM=${q(partnersMeta)},EM=${q(embeddersMeta)},EP=${q(embedParam)},EA=${q(embeddedAttr)},FR=${q(frameClass)};` +
  // set on a partner's column once its page has answered;
  // how long, in milliseconds, it is waited for
  `var RD=${q(frameReadyAttr)},FT=4000;` +
  "function metaList(n){var m=document.querySelector('meta[name=\"'+n+'\"]');" +
  "return m?(m.getAttribute('content')||'').split(' ').filter(Boolean):[];}" +
  "var PT=metaList(PM),EB=metaList(EM);" +
  "function abs(r){return r.indexOf('https://')===0||r.indexOf('http://')===0;}" +
  "function partner(u){try{return PT.indexOf(new URL(u).origin)>=0;}catch(e){return false;}}" +
  "function bare0(p){return p.length>1?p.replace(/\\/+$/,''):p;}" +
  // this page, shown as a column of a site it allows
  "var EMB=window.parent!==window&&EB.length>0&&new URL(window.location.href).searchParams.get(EP)==='1';" +
  "if(EMB){document.documentElement.setAttribute(EA,'');}" +
  // say something to the page this one is a column of:
  // addressed to each allowed embedder by its exact origin,
  // so no other page can hear it
  "function tell(m){for(var i=0;i<EB.length;i++){window.parent.postMessage(m,EB[i]);}}" +
  // escape one field so a route or a quoted passage can
  // carry the separators themselves
  "function esc(v){return v.split(E).join(E+'t')" +
  ".split(N).join(E+'c').split(F).join(E+'f');}" +
  // the exact inverse, undone in reverse order
  "function unesc(v){return v.split(E+'f').join(F)" +
  ".split(E+'c').join(N).split(E+'t').join(E);}" +
  // percent-encode a parameter value, keeping the
  // separators and slashes literal — byte-identical to
  // the server's own emission
  "function pct(v){return encodeURIComponent(v)" +
  ".split('%2F').join('/').split('%2C').join(N)" +
  ".split('%3A').join(F);}" +
  "function ps(){return new URL(window.location.href).searchParams;}" +
  // the columns to the head's right, as raw entries
  "function entries(){var v=ps().get(R);return v?v.split(N):[];}" +
  "function entryOf(r,s){return esc(r)+(s?F+esc(s):'');}" +
  "function routeOf(e){var i=e.indexOf(F);" +
  "return unesc(i<0?e:e.slice(0,i));}" +
  "function spanOf(e){var i=e.indexOf(F);" +
  "return i<0?'':unesc(e.slice(i+1));}" +
  // the composition URL for a given list of entries
  "function urlFor(list){var p=[];" +
  "if(list.length){p.push(R+'='+pct(list.join(N)));}" +
  "var s=ps().get(Q);if(s){p.push(Q+'='+pct(s));}" +
  "return window.location.pathname+(p.length?'?'+p.join('&'):'');}" +
  "function strip(){return document.querySelector('['+S+']');}" +
  // the site's base path: a column names its route
  // relative to the site root, the address bar does not
  "var B=(function(){var h=document.querySelector('['+C+']');" +
  "var a=h?h.getAttribute(C)||'':'';var p=window.location.pathname;" +
  "return a&&p.length>a.length&&p.slice(p.length-a.length)===a" +
  "?p.slice(0,p.length-a.length):'';})();" +
  // a column on its way out is no longer part of the
  // strip: the URL, the trail and the next open must not
  // count it
  "function cols(){return document.querySelectorAll('['+C+']:not(['+LV+'])');}" +
  // drop every column to the right of `at`. The strip is
  // what you are reading now, not a log of everywhere you
  // have been: opening from a middle column closes what
  // stood beyond it.
  "function changed(){if(document.dispatchEvent){document.dispatchEvent(new Event('plgg:columns'));}}" +
  // CLOSE one column: mark it, and let whatever animation
  // the stylesheet starts on that mark run before the node
  // goes. No animation (none declared, or the reader asked
  // for less motion) means it goes now.
  "function leave(n){n.setAttribute(LV,'');" +
  "var a=R0||!n.getAnimations?[]:n.getAnimations();" +
  "if(!a.length){n.remove();return;}" +
  "var done=function(){n.remove();};" +
  "Promise.all(a.map(function(x){return x.finished;})).then(done,done);}" +
  // `now` drops them without their leaving animation: used
  // when another column is about to stand exactly where
  // they stood, so nothing should be seen to go
  "function truncate(at,now){var c=cols();" +
  "for(var i=c.length-1;i>at;i--){if(now){c[i].remove();}else{leave(c[i]);}}sync();changed();}" +
  // place a fetched column immediately after the one it
  // was opened from, so whatever else the strip holds (a
  // chrome rail, a nav column) keeps its position
  "function place(node,at){var c=cols();var prev=c[at];" +
  "prev.parentNode.insertBefore(node,prev.nextSibling);" +
  "var see=function(){node.scrollIntoView({inline:'nearest',block:'nearest',behavior:R0?'auto':'smooth'});};" +
  "see();" +
  // a stylesheet may ease the column in from no width; at
  // that moment it is "in view" wherever it stands, so look
  // again once it has its size
  "node.addEventListener('animationend',function(ev){if(ev.target===node){see();}},{once:true});" +
  "showMark(node);sync();changed();}" +
  // put a column's highlighted passage under the reader's
  // eyes. The mark is server-rendered — it exists only
  // because the quotation located in the document exactly
  // once — so this only ever scrolls to the document's own
  // words.
  "function showMark(node){var m=node.querySelector('mark');" +
  "if(m){m.scrollIntoView({block:'center'});}}" +
  // the URL a column is FETCHED from: the route itself,
  // carrying its passage so the SERVER locates and marks it
  // — a highlight is never painted by this runtime.
  "function colUrl(route,span){" +
  "return route+(span?'?'+Q+'='+pct(esc(span)):'');}" +
  // fetch one column's own page and take the placeable
  // element out of it. Scripts parsed by DOMParser never
  // execute, so a placed column can never re-run this
  // runtime.
  // a partner's page as a column: this site's own column
  // shape around a frame. The frame may run its page's
  // scripts in its own origin and nothing more — it cannot
  // move this page, open windows or submit forms out.
  "function frameCol(u){var all=cols(),base=all[all.length-1];var x=new URL(u);" +
  "var col=document.createElement('div');col.className=base.className;col.setAttribute(C,x.origin+x.pathname);" +
  "var hd=base.querySelector(':scope>header');var h=document.createElement('header');h.className=hd?hd.className:'';" +
  "var t0=hd?hd.firstElementChild:null;var sp=document.createElement('span');sp.className=t0?t0.className:'';" +
  "sp.textContent=x.host+x.pathname;h.appendChild(sp);col.appendChild(h);" +
  "var f=document.createElement('iframe');f.className=FR;" +
  "f.setAttribute('sandbox','allow-scripts allow-same-origin');" +
  "f.setAttribute('referrerpolicy','strict-origin-when-cross-origin');" +
  "f.title=sp.textContent;var src=new URL(x.origin+x.pathname);src.searchParams.set(EP,'1');f.src=src.href;" +
  // A partner that does not answer cannot be a column: its
  // site may be down, or may not let this one frame it, and
  // the frame would stand empty. A partner's page says its
  // title as soon as it runs; when none has come in time,
  // the column is closed and the link is simply followed.
  "col.appendChild(f);" +
  "setTimeout(function(){if(col.hasAttribute(RD)||!col.isConnected){return;}" +
  "var at=columnOf(col);if(at>0){truncate(at-1,true);" +
  "window.history.replaceState(null,'',urlFor(current().slice(1)));}" +
  "window.location.assign(x.origin+x.pathname);},FT);" +
  "return col;}" +
  "function fetchCol(route,span){" +
  "if(abs(route)){return partner(route)&&strip()&&cols().length" +
  "?Promise.resolve(frameCol(route)):Promise.reject(new Error('nav'));}" +
  "return fetch(colUrl(route,span),{credentials:'same-origin',mode:'same-origin'})" +
  ".then(function(r){if(!r.ok){throw new Error('nav');}return r.text();})" +
  ".then(function(t){" +
  "var d=new DOMParser().parseFromString(t,'text/html');" +
  "var col=d.querySelector('['+C+']');" +
  "if(!col||!strip()||!cols().length){throw new Error('nav');}" +
  // A fetched page can declare styles, inert data and a single initializer
  // for its column. Ordinary content scripts stay inert.
  "const init=d.querySelector('body > script[data-column-init]');if(init){" +
  "for(const style of d.querySelectorAll('head > style[data-column-style]')){" +
  "if(!Array.from(document.querySelectorAll('style[data-column-style]')).some(s=>s.dataset.columnStyle===style.dataset.columnStyle))document.head.appendChild(document.importNode(style,true));}" +
  "const data=d.querySelector('body > script[type=\"application/json\"][data-column-data]');if(data)col.appendChild(document.importNode(data,true));" +
  "if(!document.querySelector('script[data-column-init]')){" +
  "const script=document.createElement('script');script.type='module';script.dataset.columnInit='';script.textContent=init.textContent;document.head.appendChild(script);}}" +
  "return document.importNode(col,true);});}" +
  // OPEN a route as the column after index `at`. The
  // originating column's DOM node is never touched, so its
  // scroll position cannot be lost.
  "function openFrom(at,route,span){" +
  "var url=urlFor(entries().slice(0,at).concat([entryOf(route,span)]));" +
  "return fetchCol(route,span).then(function(col){" +
  // opening from a column that already has one to its
  // right REPLACES it: same place, same room. Mark the
  // newcomer so it is not animated as an arrival.
  "var rep=cols().length>at+1;" +
  "if(rep){col.setAttribute(RP,'');}" +
  "truncate(at,rep);place(col,at);" +
  "window.history.pushState(null,'',url);return true;}).catch(function(){" +
  "window.location.assign(abs(route)?route:url);return false;});}" +
  // the strip's rightmost column — where an open with no
  // originating column lands
  "function last(){return cols().length-1;}" +
  "function open(route,span){return openFrom(last(),route,span);}" +
  // WHICH COLUMN a node is in, or -1 when it is in none
  "function columnOf(node){var c=cols();" +
  "for(var i=0;i<c.length;i++){if(c[i].contains(node)){return i;}}" +
  "return -1;}" +
  // the anchor an event came from, walking up from the
  // target; null when the click was not on a link
  "function anchorOf(node){var e=node;" +
  "while(e&&e!==document){if(e.tagName==='A'){return e;}e=e.parentNode;}" +
  "return null;}" +
  // IS THIS CLICK OURS? Everything the browser does better
  // is left to the browser: a modified click still opens a
  // tab, an external link still leaves, a download still
  // downloads, and a same-page fragment still jumps inside
  // its own column.
  "function plain(ev,a){return !ev.defaultPrevented&&ev.button===0" +
  "&&!ev.metaKey&&!ev.ctrlKey&&!ev.shiftKey&&!ev.altKey" +
  "&&!!a&&!a.hasAttribute('download')" +
  "&&(a.target===''||a.target==='_self');}" +
  // a link to a partner's page: opened beside, in a frame
  "function claimsOut(ev,a){return plain(ev,a)&&partner(a.href);}" +
  "function claims(ev,a){return plain(ev,a)" +
  "&&a.origin===window.location.origin" +
  "&&!(a.pathname===window.location.pathname&&a.hash!=='');}" +
  // WHAT IS ON SCREEN, in the same alphabet the URL uses —
  // route and passage both, because a column at the right
  // route showing the wrong passage is a different column.
  "function full(a){return abs(a)?a:B+a;}" +
  "function current(){var c=cols();var out=[];" +
  "for(var i=0;i<c.length;i++){out.push(entryOf(" +
  "full(c[i].getAttribute(C)||''),c[i].getAttribute(P)||''));}return out;}" +
  // WHAT THE URL SAYS: the head (this page) then the rest.
  "function target(){var s=ps().get(Q);" +
  "return [entryOf(window.location.pathname,s||'')].concat(entries());}" +
  // RECONCILE the strip to the URL, rather than undoing
  // whatever the last navigation did. Back, Forward, a
  // multi-step Back and a pasted URL are then the same
  // operation — and a kept column keeps its DOM node, so
  // going back and forward across it neither refetches it
  // nor resets its scroll.
  "function reconcile(){var t=target(),c=current();" +
  // the head itself changed: this page is a different page,
  // and its nav columns differ too. The URL is already
  // right, so the honest move is to render it.
  "if(!c.length||t[0]!==c[0]){window.location.reload();return;}" +
  "var k=1;while(k<t.length&&k<c.length&&t[k]===c[k]){k++;}" +
  "truncate(k-1);" +
  "var i=k;" +
  "var step=function(){if(i>=t.length){return Promise.resolve(true);}" +
  "var e=t[i];var at=i-1;i++;" +
  "return fetchCol(routeOf(e),spanOf(e)).then(function(col){" +
  "place(col,at);return step();});};" +
  // A column that cannot be fetched is not worth a reload:
  // the reload would ask for the same column and fail the
  // same way, forever. Keep what did open and make the
  // address say exactly that.
  "return step().catch(function(){" +
  "window.history.replaceState(null,'',urlFor(current().slice(1)));sync();});}" +
  // CLOSE a column and everything beyond it
  "function fold(at){truncate(at-1);" +
  "window.history.pushState(null,'',urlFor(entries().slice(0,at-1)));}" +
  "function titleOf(c){var hd=c.querySelector(':scope>header');" +
  "var h=hd?(hd.firstElementChild||hd):c.querySelector('h1');" +
  "return (h?h.textContent:c.getAttribute(C)||'').trim();}" +
  // KEEP THE CHROME HONEST: every column past the head
  // gets a close control, the trail lists what is open,
  // and the sidebar marks the column read last.
  "function sync(){var c=cols();" +
  "for(var i=0;i<c.length;i++){(function(col,i){" +
  "var b=col.querySelector('.'+FC);" +
  // only the RIGHTMOST column closes, and not the head: a
  // strip is closed from its end, a page at a time
  "if(i===0||i!==c.length-1){if(b){b.remove();}return;}" +
  "if(!b){b=document.createElement('button');b.type='button';" +
  "b.className=FC;b.setAttribute('aria-label','この列を閉じる');" +
  "b.textContent='\u00d7';var hd=col.querySelector(':scope>header');" +
  "if(hd){hd.appendChild(b);}else{col.insertBefore(b,col.firstChild);}}" +
  "})(c[i],i);}" +
  "var s=strip();if(!s){return;}" +
  "var t=document.querySelector('.'+TC);" +
  "if(c.length<2){if(t){t.remove();}}else{" +
  "if(!t){t=document.createElement('nav');t.className=TC;" +
  "t.setAttribute('aria-label','開いている列');" +
  "s.parentNode.insertBefore(t,s);}t.textContent='';" +
  "for(var j=0;j<c.length;j++){(function(col,j){" +
  "var a=document.createElement('button');a.type='button';" +
  "a.textContent=titleOf(col);" +
  "if(j===c.length-1){a.setAttribute('aria-current','true');}" +
  "a.setAttribute('data-col',String(j));" +
  "t.appendChild(a);})(c[j],j);}}" +
  // with nothing followed, the page itself is current; a
  // static host may add a trailing slash, so compare bare
  "var bare=function(p){return p.length>1?p.replace(/\\/+$/,''):p;};" +
  // WHAT OPENED WHAT: in each column, the links that lead to
  // the column on its right carry the mark; every other
  // link in it loses it. Read off the strip itself, so it
  // is right after a click, a Back and a pasted address.
  "for(var o=0;o<c.length;o++){" +
  "var nx=c[o+1];var na=nx?nx.getAttribute(C)||'':'';var out=abs(na);" +
  "var want=nx?(out?bare(na):bare(B+na)):null;" +
  "var as=c[o].querySelectorAll('a[href]');" +
  "for(var u=0;u<as.length;u++){var k=as[u];" +
  "if(want!==null&&(out?bare(k.origin+k.pathname)===want:k.origin===window.location.origin&&bare(k.pathname)===want)){k.setAttribute(OP,'');}" +
  "else if(k.hasAttribute(OP)){k.removeAttribute(OP);}}}" +
  "var r=bare(c.length?B+(c[c.length-1].getAttribute(C)||''):location.pathname);" +
  "var ls=document.querySelectorAll('a[href]');" +
  "for(var m=0;m<ls.length;m++){var l=ls[m];" +
  "if(columnOf(l)>=0||!l.closest('nav')){continue;}" +
  // the marks the page was rendered with (its own row AND
  // its section's) are what holds while nothing is followed
  "if(l.getAttribute('data-home')===null){l.setAttribute('data-home',l.getAttribute('aria-current')==='page'?'1':'0');}" +
  "if(c.length?bare(l.pathname)===r:l.getAttribute('data-home')==='1'){l.setAttribute('aria-current','page');}" +
  "else if(l.getAttribute('aria-current')==='page'){l.removeAttribute('aria-current');}}}" +
  // WHAT A FRAME MAY SAY, and who is believed. A message
  // counts only when its origin is a partner, its sender is
  // the window of a frame this page opened, and that frame
  // was opened for that same partner. It may name its page,
  // which is set as text, or ask for a link to be opened
  // beside it, which is opened only when it leads to this
  // site or to a partner. Anything else is dropped.
  // LIGHT OR DARK is this page's to say: each partner's
  // column is told when it first answers and whenever the
  // reader switches, addressed to that partner's origin
  // alone.
  "function shade(col){var f=col.querySelector(':scope>iframe.'+FR);if(!f||!f.contentWindow){return;}" +
  "var o;try{o=new URL(col.getAttribute(C)||'').origin;}catch(e){return;}" +
  "if(PT.indexOf(o)<0){return;}" +
  "f.contentWindow.postMessage({type:'pm:scheme',scheme:document.documentElement.classList.contains('dark')?'dark':'light'},o);}" +
  "if(PT.length&&window.MutationObserver){new MutationObserver(function(){" +
  "var c=cols();for(var i=0;i<c.length;i++){shade(c[i]);}})" +
  ".observe(document.documentElement,{attributes:true,attributeFilter:['class']});}" +
  // SHOWN AS A COLUMN, this page hears one thing from the
  // site it stands in, and only from that site: whether to
  // be light or dark. Nothing else is read, and the
  // reader's own choice for this site is left as it was.
  "if(EMB){window.addEventListener('message',function(ev){" +
  "if(ev.source!==window.parent||EB.indexOf(ev.origin)<0||!ev.data||ev.data.type!=='pm:scheme'){return;}" +
  "if(ev.data.scheme==='dark'){document.documentElement.classList.add('dark');}" +
  "else if(ev.data.scheme==='light'){document.documentElement.classList.remove('dark');}});" +
  // a sideways scroll that nothing here can take is the
  // strip's: hand it to the site this page stands in
  "window.addEventListener('wheel',function(ev){" +
  "var dx=ev.deltaX*(ev.deltaMode===1?16:1);" +
  "if(!dx||Math.abs(dx)<=Math.abs(ev.deltaY)){return;}" +
  "var e=ev.target;while(e&&e!==document&&e.nodeType===1){" +
  "var ox=window.getComputedStyle(e).overflowX;" +
  "if((ox==='auto'||ox==='scroll')&&e.scrollWidth>e.clientWidth+1){" +
  "if(dx<0?e.scrollLeft>0:e.scrollLeft+e.clientWidth<e.scrollWidth-1){return;}}" +
  "e=e.parentNode;}" +
  "ev.preventDefault();tell({type:'pm:scroll',dx:dx});},{passive:false});}" +
  "var SX=0,SL=0,SW=0;" +
  "window.addEventListener('message',function(ev){" +
  "if(PT.indexOf(ev.origin)<0||!ev.data||typeof ev.data!=='object'){return;}" +
  "var c=cols(),at=-1;for(var i=0;i<c.length;i++){" +
  "var f=c[i].querySelector(':scope>iframe.'+FR);if(f&&f.contentWindow===ev.source){at=i;}}" +
  "if(at<0){return;}" +
  "try{if(new URL(c[at].getAttribute(C)||'').origin!==ev.origin){return;}}catch(e){return;}" +
  "var d=ev.data;" +
  "if(d.type==='pm:title'&&typeof d.title==='string'){" +
  "c[at].setAttribute(RD,'');shade(c[at]);" +
  "var sp=c[at].querySelector(':scope>header>span');if(sp){sp.textContent=d.title.slice(0,120);}sync();return;}" +
  // a sideways scroll made inside a frame belongs to the
  // strip the frame stands in. The strip rests on a column
  // edge, so the scroll is gathered until it is plainly
  // meant, then the neighbouring column is brought into
  // view — one column a gesture, however long it coasts.
  "if(d.type==='pm:scroll'&&typeof d.dx==='number'&&isFinite(d.dx)){" +
  "var now=Date.now();if(now<SW){return;}" +
  "if(now-SL>250){SX=0;}SL=now;SX+=Math.max(-600,Math.min(600,d.dx));" +
  "if(Math.abs(SX)<60){return;}" +
  "var to=c[at+(SX>0?1:-1)];SX=0;SW=now+450;" +
  "if(to){to.scrollIntoView({inline:'nearest',block:'nearest',behavior:R0?'auto':'smooth'});}" +
  "else{var st=strip();if(st){st.scrollBy({left:SX>0?st.clientWidth:-st.clientWidth,behavior:R0?'auto':'smooth'});}}" +
  "return;}" +
  "if(d.type==='pm:open'&&typeof d.href==='string'){var u;try{u=new URL(d.href);}catch(e){return;}" +
  "if(u.protocol!=='https:'&&u.protocol!=='http:'){return;}" +
  "if(u.origin===window.location.origin){openFrom(at,u.pathname);}" +
  "else if(PT.indexOf(u.origin)>=0){openFrom(at,u.origin+u.pathname);}}});" +
  "if(EMB){tell({type:'pm:title',title:document.title});}" +
  "window.addEventListener('popstate',function(){reconcile();});" +
  // on a hard load of a composition URL, the marks are
  // already in the markup: put each column on its own.
  "for(var k=0;k<cols().length;k++){showMark(cols()[k]);}" +
  // a static host renders only the head: open the rest
  "(function(){var t=target(),c=current();" +
  "if(c.length&&t[0]===c[0]&&t.length>c.length){reconcile();}else{sync();}})();" +
  "document.addEventListener('click',function(ev){" +
  // the chrome this runtime adds answers through the one
  // delegated listener, never an inline handler
  // shown as a column of another site: a link that could
  // be a column there is handed to that site to open
  // beside this one; this page itself stays put
  "if(EMB){var a0=anchorOf(ev.target);" +
  "if(a0&&plain(ev,a0)&&(a0.origin===window.location.origin||partner(a0.href))" +
  "&&!(a0.pathname===window.location.pathname&&a0.hash!=='')){" +
  "ev.preventDefault();tell({type:'pm:open',href:a0.origin+a0.pathname});}return;}" +
  "var t=ev.target;var fb=t&&t.closest?t.closest('.'+FC):null;" +
  "if(fb){ev.preventDefault();fold(columnOf(fb));return;}" +
  "var tb=t&&t.closest?t.closest('.'+TC+' [data-col]'):null;" +
  "if(tb){var cc=cols()[Number(tb.getAttribute('data-col'))];" +
  "if(cc){cc.scrollIntoView({inline:'nearest',block:'nearest'});}return;}" +
  "var a=anchorOf(ev.target);" +
  "if(claimsOut(ev,a)){var from=columnOf(a);if(from<0){return;}" +
  "ev.preventDefault();openFrom(from,a.origin+a.pathname);return;}" +
  "if(!claims(ev,a)){return;}" +
  "var at=columnOf(a);if(at<0){return;}" +
  "ev.preventDefault();openFrom(at,a.pathname);});" +
  `window[${q(
    navHookName,
  )}]={open:open,openFrom:openFrom,urlFor:urlFor,entries:entries,entryOf:entryOf,columnOf:columnOf,claims:claims,current:current,target:target,reconcile:reconcile,fold:fold};` +
  "})();";

/**
 * Insert the runtime just before `</body>` — after the
 * document's own content, so the markers it navigates by
 * already exist when it runs. A page with no `</body>`
 * passes through unchanged (the same idempotent guard
 * `injectAppearanceScript` records).
 */
export const injectNavigationScript = (
  html: SoftStr,
): SoftStr =>
  html.includes("</body>")
    ? html.replace(
        "</body>",
        `<script>${navigationInitScript}</script></body>`,
      )
    : html;
