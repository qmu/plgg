import { type SoftStr } from "plgg";
import { columnAttr } from "plggmatic/Navigate/model/marker";
import {
  shareClass,
  leavingAttr,
  carouselPrevClass,
  carouselNextClass,
} from "plggmatic/Meta/model/classHooks";

const q = (value: SoftStr): SoftStr =>
  JSON.stringify(value);

/**
 * The shared strip's CAROUSEL: two controls at the strip's
 * edges that step it one column at a time. A strip that
 * holds more columns than the window shows scrolls
 * sideways; a wheel and a trackpad do that well, a mouse
 * with only a vertical wheel does not, and neither says
 * "there is more over here". The controls do.
 *
 * Each shows only while there is something its way: the
 * previous control once the strip has left its start, the
 * next control until it reaches its end. A step lands a
 * column's left edge at the strip's own left edge, past
 * whatever is pinned over it (read from the strip's
 * `scroll-padding-left`), so a column is never left half
 * under a sidebar.
 *
 * Built to the shape of the framework's other inline
 * runtimes: dependency-free, every literal sourced from an
 * exported constant, a no-op on a page with no shared
 * strip. Progressive: without it the strip still scrolls.
 * Contains no `</script` sequence; a statement, to be
 * placed inside a host's own script element.
 */
export const carouselInitScript: SoftStr =
  "(function(){" +
  `var s=document.querySelector(${q("." + shareClass)});` +
  "if(!s||!s.parentNode){return;}" +
  `var C=${q(columnAttr)},LV=${q(leavingAttr)};` +
  "var R0=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;" +
  "function cols(){return s.querySelectorAll('['+C+']:not(['+LV+'])');}" +
  // where a column's left edge comes to rest
  "function edge(){return s.getBoundingClientRect().left+(parseFloat(getComputedStyle(s).scrollPaddingLeft)||0);}" +
  "function step(dir){var c=cols(),L=edge(),t=null,i;" +
  "if(dir>0){for(i=0;i<c.length;i++){if(c[i].getBoundingClientRect().left>L+1){t=c[i];break;}}}" +
  "else{for(i=c.length-1;i>=0;i--){if(c[i].getBoundingClientRect().left<L-1){t=c[i];break;}}}" +
  "if(t){s.scrollBy({left:t.getBoundingClientRect().left-L,behavior:R0?'auto':'smooth'});}}" +
  "function make(cls,label,dir){var b=document.createElement('button');" +
  "b.type='button';b.className=cls;b.setAttribute('aria-label',label);b.hidden=true;" +
  "b.addEventListener('click',function(){step(dir);});s.parentNode.appendChild(b);return b;}" +
  `var prev=make(${q(carouselPrevClass)},'前の列へ',-1);` +
  `var next=make(${q(carouselNextClass)},'次の列へ',1);` +
  "function update(){var max=s.scrollWidth-s.clientWidth;" +
  "prev.hidden=s.scrollLeft<=1;next.hidden=s.scrollLeft>=max-1;}" +
  "s.addEventListener('scroll',update,{passive:true});" +
  "s.addEventListener('animationend',update);" +
  "window.addEventListener('resize',update);" +
  "document.addEventListener('plgg:columns',function(){update();setTimeout(update,450);});" +
  "update();})();";
