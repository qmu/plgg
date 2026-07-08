/**
 * Demo 1's page stylesheet.
 *
 * These rules override 16 framework `pm-*` classes by name
 * (`.pm-scheduler`, `.pm-row`, `.pm-col`, `.pm-colhead`,
 * `.pm-colhead-title`, `.pm-close`, `.pm-pane`,
 * `.pm-menu-body`, `.pm-query`, `.pm-list`, `.pm-list-item`,
 * `.pm-row-link`, `.pm-list-action`, `.pm-list-actions`,
 * `.pm-form`, `.pm-btn-primary`) plus the demo's own `bo-*`
 * chrome. Keeping the override block here — one documented
 * place — makes the framework-class coupling visible and
 * greppable instead of buried in the CSR entry.
 *
 * The coupling itself is a smell: cleanly removing it would
 * mean giving plggmatic real theming hooks so a consumer
 * restyles through tokens/slots rather than by class name.
 * That is a framework change, out of scope here; tracked as
 * a candidate follow-up.
 */
export const demo1Css = `
body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;background:var(--pm-surface);color:var(--pm-text);overflow:hidden;}
.bo-root{height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.pm-scheduler{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:0 1rem;}
.pm-row{flex:1;min-height:0;height:auto;gap:0.5rem;overflow-x:auto;overflow-y:hidden;}
.bo-topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:var(--pm-surface);color:var(--pm-text);line-height:1;}
.bo-navleft{display:flex;align-items:center;gap:0.75rem;min-width:0;}
.bo-brand{font-weight:600;white-space:nowrap;}
.pm-query{width:100%;box-sizing:border-box;padding:0.35rem 0.5rem;margin:0.35rem 0;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);}
:root{--pm-surface:#ffffff;--pm-surface-2:#ffffff;--pm-text:#000000;--pm-primary-base:#000000;--pm-primary-text:#ffffff;--pm-border:#d4d4d4;}
html.dark{--pm-surface:#000000;--pm-surface-2:#000000;--pm-text:#ffffff;--pm-primary-base:#ffffff;--pm-primary-text:#000000;--pm-border:#3a3a3a;}
.pm-col{border-right:none;height:auto;}
.pm-colhead{border-bottom:none;background:transparent;color:var(--pm-text);border-radius:0;height:auto;padding:0;margin-bottom:0.5rem;justify-content:flex-start;}
.pm-colhead .pm-colhead-title{background:transparent;color:var(--pm-text);border-radius:0;padding:0;margin:0;font-weight:700;font-size:0.95rem;flex:0 0 auto;}
.pm-colhead .pm-close{color:var(--pm-text);transition:transform 0.15s ease;}
.pm-colhead .pm-close:hover{background:transparent;color:var(--pm-text);transform:scale(1.3) rotate(90deg);}
.pm-pane{padding-top:0.25rem;}
.bo-topbar>button{width:30px;height:30px;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;}
.bo-topbar>button svg{width:15px;height:15px;}
.pm-menu-body{padding:0;border:none;}
.pm-menu-body ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.1rem;}
.pm-menu-body li a{display:inline-block;border:none;border-radius:6px;padding:0.15rem 0.4rem;margin-left:-0.4rem;background:transparent;color:var(--pm-text);text-decoration:none;font-size:0.95rem;}
.pm-list{margin:0;padding:0;border:1px solid var(--pm-border);border-radius:8px;background:var(--pm-surface);overflow:hidden;}
.pm-list-item{margin:0;}
.pm-list-item+.pm-list-item{margin-top:0;border-top:1px solid var(--pm-border);}
.pm-row-link{display:block;border:none;border-radius:0;background:transparent;padding:0.35rem 0.65rem;color:var(--pm-text);}
.pm-menu-body li a:not([aria-current="page"]):hover,.pm-row-link:not([aria-current="page"]):hover{background:var(--pm-text);color:var(--pm-surface);}
.pm-menu-body li a:focus-visible,.pm-row-link:focus-visible{outline-offset:0;}
.pm-list-actions{display:flex;flex-direction:column;margin:0 0 0.5rem 0;}
.pm-list-action{display:block;border:1px solid var(--pm-border);border-radius:8px;padding:0.5rem 0.65rem;background:var(--pm-surface);color:var(--pm-text);text-decoration:none;text-align:center;}
.pm-list-action:not([aria-current="page"]):hover{background:color-mix(in oklab,var(--pm-text) 8%,transparent);}
.pm-form>*:first-child{margin-top:0;}
.pm-form{background:transparent;border:none;border-radius:0;padding:0;box-sizing:border-box;}
.pm-btn-primary{background:transparent;color:var(--pm-text);border-color:var(--pm-text);}
.pm-btn-primary:hover{background:var(--pm-text);color:var(--pm-surface);}
.pm-row .pm-col{flex:0 0 240px;width:240px;}
.pm-row .pm-col:has(.pm-menu-body){flex:0 0 190px;width:190px;}
.pm-row .pm-col:has(.pm-form){flex:0 0 380px;width:380px;}
.pm-row .pm-col:has(.bo-search-condition){flex:0 0 260px;width:260px;}
.pm-row .pm-col:has(.bo-results){flex:0 0 340px;width:340px;}
.bo-hidelist .pm-col:has(.pm-query){display:none;}
.bo-result-name{display:block;font-weight:600;line-height:1.35;}
.bo-result-meta{display:block;margin-top:0.1rem;font-size:0.82rem;line-height:1.3;color:color-mix(in oklab,var(--pm-text) 58%,transparent);}
.pm-pane a[aria-current="page"]{background:var(--pm-text);color:var(--pm-surface);box-shadow:none;}
.pm-menu-body li a,.pm-row-link,.pm-list-action,.pm-colhead-title,.bo-topbar>button{transition:background-color 0.15s ease,color 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease,transform 0.08s ease;}
.pm-menu-body li a:active,.pm-row-link:active,.pm-list-action:active,.bo-topbar>button:active{transform:scale(0.97);}
`;
