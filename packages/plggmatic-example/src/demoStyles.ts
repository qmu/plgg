import { zValue } from "plggmatic/style";

/**
 * The demo-only stylesheet for the framework's `pm-*`
 * interactive hooks the design system does not itself own
 * yet (form controls, the modal dialog, toasts — a real
 * app injects its own, or a future ticket ships them as
 * framework CSS). Shared by the scheduler demo and the
 * forms demo so both look consistent. Colours are the
 * framework `--pm-*` variables; the dialog's stacking uses
 * ticket 05's `backdrop`/`overlay` z-bands via `zValue`.
 */
export const demoCss = `
.pm-menu-body{padding:0.5rem;}
.pm-pane{padding:0.5rem;}
.pm-single{max-width:640px;margin:0 auto;padding:1.5rem;}
.pm-list{list-style:none;margin:0;padding:0;}
.pm-row-link{display:block;padding:0.35rem 0.5rem;border-radius:6px;color:var(--pm-text);text-decoration:none;}
.pm-row-link:hover{background:var(--pm-surface-2);}
.pm-back{display:inline-block;margin-bottom:0.5rem;color:var(--pm-muted);text-decoration:none;}
.pm-fields{margin:0.5rem 0;}
.pm-field{margin:0.6rem 0;display:flex;flex-direction:column;gap:0.2rem;}
.pm-check{flex-direction:row;align-items:center;gap:0.5rem;}
.pm-field-label{font-size:0.85rem;font-weight:600;color:var(--pm-muted);}
.pm-input{padding:0.4rem 0.55rem;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);font:inherit;}
.pm-field-error{color:var(--pm-danger-base);font-size:0.8rem;}
.pm-disabled{opacity:0.55;cursor:not-allowed;}
.pm-form{display:flex;flex-direction:column;gap:0.5rem;max-width:420px;}
.pm-actions{display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;}
.pm-btn{padding:0.35rem 0.75rem;border:1px solid var(--pm-border);border-radius:6px;background:var(--pm-surface);color:var(--pm-text);cursor:pointer;font:inherit;}
.pm-btn-primary{background:var(--pm-primary-base);color:var(--pm-primary-text);border-color:var(--pm-primary-base);}
.pm-btn-danger{border-color:var(--pm-danger-base);color:var(--pm-danger-base);}
.pm-hint{color:var(--pm-muted);}
.pm-error{color:var(--pm-danger-base);}
.pm-modal{position:fixed;inset:0;}
.pm-backdrop{position:fixed;inset:0;z-index:${zValue("backdrop")};background:rgba(0,0,0,0.4);}
.pm-dialog{position:fixed;z-index:${zValue("overlay")};top:50%;left:50%;transform:translate(-50%,-50%);min-width:280px;max-width:90vw;padding:1.25rem;border-radius:10px;background:var(--pm-surface);border:1px solid var(--pm-border);}
.pm-dialog-actions{display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;}
.pm-toaster{position:fixed;right:1rem;bottom:1rem;display:flex;flex-direction:column;gap:0.5rem;z-index:${zValue("overlay")};}
.pm-toast{display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.9rem;border-radius:8px;border:1px solid var(--pm-border);}
.pm-toast-success{background:var(--pm-success-surface);color:var(--pm-success-text);border-color:var(--pm-success-border);}
.pm-toast-danger{background:var(--pm-danger-surface);color:var(--pm-danger-text);border-color:var(--pm-danger-border);}
.pm-toast-warning{background:var(--pm-warning-surface);color:var(--pm-warning-text);border-color:var(--pm-warning-border);}
.pm-toast-info{background:var(--pm-info-surface);color:var(--pm-info-text);border-color:var(--pm-info-border);}
.pm-toast-close{background:none;border:none;cursor:pointer;color:inherit;font-size:1.1rem;}
`;
