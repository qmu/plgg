import { type SoftStr } from "plgg";
import {
  stripAttr,
  columnAttr,
  spanAttr,
  navHookName,
} from "plggmatic/Navigate/model/marker";
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
  `var S=${q(stripAttr)},C=${q(columnAttr)},P=${q(spanAttr)};` +
  `var R=${q(restParam)},Q=${q(spanParam)};` +
  `var E=${q(escapeChar)},N=${q(entrySeparator)},F=${q(fieldSeparator)};` +
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
  "function cols(){return document.querySelectorAll('['+C+']');}" +
  // drop every column to the right of `at`. The strip is
  // what you are reading now, not a log of everywhere you
  // have been: opening from a middle column closes what
  // stood beyond it.
  "function truncate(at){var c=cols();" +
  "for(var i=c.length-1;i>at;i--){c[i].remove();}}" +
  // place a fetched column immediately after the one it
  // was opened from, so whatever else the strip holds (a
  // chrome rail, a nav column) keeps its position
  "function place(node,at){var c=cols();var prev=c[at];" +
  "prev.parentNode.insertBefore(node,prev.nextSibling);" +
  "node.scrollIntoView({inline:'end',block:'nearest'});" +
  "showMark(node);}" +
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
  "function fetchCol(route,span){" +
  "return fetch(colUrl(route,span),{credentials:'same-origin'})" +
  ".then(function(r){if(!r.ok){throw new Error('nav');}return r.text();})" +
  ".then(function(t){" +
  "var d=new DOMParser().parseFromString(t,'text/html');" +
  "var col=d.querySelector('['+C+']');" +
  "if(!col||!strip()||!cols().length){throw new Error('nav');}" +
  "return document.importNode(col,true);});}" +
  // OPEN a route as the column after index `at`. The
  // originating column's DOM node is never touched, so its
  // scroll position cannot be lost.
  "function openFrom(at,route,span){" +
  "var url=urlFor(entries().slice(0,at).concat([entryOf(route,span)]));" +
  "return fetchCol(route,span).then(function(col){" +
  "truncate(at);place(col,at);" +
  "window.history.pushState(null,'',url);return true;}).catch(function(){" +
  "window.location.assign(url);return false;});}" +
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
  "function claims(ev,a){return !ev.defaultPrevented&&ev.button===0" +
  "&&!ev.metaKey&&!ev.ctrlKey&&!ev.shiftKey&&!ev.altKey" +
  "&&!!a&&!a.hasAttribute('download')" +
  "&&(a.target===''||a.target==='_self')" +
  "&&a.origin===window.location.origin" +
  "&&!(a.pathname===window.location.pathname&&a.hash!=='');}" +
  // WHAT IS ON SCREEN, in the same alphabet the URL uses —
  // route and passage both, because a column at the right
  // route showing the wrong passage is a different column.
  "function current(){var c=cols();var out=[];" +
  "for(var i=0;i<c.length;i++){out.push(entryOf(" +
  "c[i].getAttribute(C),c[i].getAttribute(P)||''));}return out;}" +
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
  "return step().catch(function(){window.location.reload();});}" +
  "window.addEventListener('popstate',function(){reconcile();});" +
  // on a hard load of a composition URL, the marks are
  // already in the markup: put each column on its own.
  "for(var k=0;k<cols().length;k++){showMark(cols()[k]);}" +
  "document.addEventListener('click',function(ev){" +
  "var a=anchorOf(ev.target);if(!claims(ev,a)){return;}" +
  "var at=columnOf(a);if(at<0){return;}" +
  "ev.preventDefault();openFrom(at,a.pathname);});" +
  `window[${q(navHookName)}]={open:open,openFrom:openFrom,urlFor:urlFor,entries:entries,entryOf:entryOf,columnOf:columnOf,claims:claims,current:current,target:target,reconcile:reconcile};` +
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
