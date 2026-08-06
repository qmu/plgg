import { zValue } from "plggmatic/style";
import {
  actionsClass,
  backClass,
  backdropClass,
  btnClass,
  btnDangerClass,
  btnPrimaryClass,
  checkClass,
  cssVarRef,
  dialogActionsClass,
  dialogClass,
  disabledClass,
  errorClass,
  fieldClass,
  fieldErrorClass,
  fieldLabelClass,
  fieldsClass,
  formClass,
  hintClass,
  inputClass,
  menuBodyClass,
  modalClass,
  paneClass,
  selector,
  singleClass,
  toastClass,
  toastCloseClass,
  toastToneClass,
  toasterClass,
} from "plggmatic";

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
${selector(menuBodyClass)}{padding:0.5rem;}
${selector(paneClass)}{padding:0.5rem;}
${selector(singleClass)}{max-width:640px;margin:0 auto;padding:1.5rem;}
${selector(backClass)}{display:inline-block;margin-bottom:0.5rem;color:${cssVarRef("muted")};text-decoration:none;}
${selector(fieldsClass)}{margin:0.5rem 0;}
${selector(fieldClass)}{margin:0.6rem 0;display:flex;flex-direction:column;gap:0.2rem;}
${selector(checkClass)}{flex-direction:row;align-items:center;gap:0.5rem;}
${selector(fieldLabelClass)}{font-size:0.85rem;font-weight:600;color:${cssVarRef("muted")};}
${selector(inputClass)}{padding:0.4rem 0.55rem;border:1px solid ${cssVarRef("border")};border-radius:6px;background:${cssVarRef("surface")};color:${cssVarRef("text")};font:inherit;}
${selector(fieldErrorClass)}{color:${cssVarRef("danger-base")};font-size:0.8rem;}
${selector(disabledClass)}{opacity:0.55;cursor:not-allowed;}
${selector(formClass)}{display:flex;flex-direction:column;gap:0.5rem;max-width:420px;}
${selector(actionsClass)}{display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;}
${selector(btnClass)}{padding:0.35rem 0.75rem;border:1px solid ${cssVarRef("border")};border-radius:6px;background:${cssVarRef("surface")};color:${cssVarRef("text")};cursor:pointer;font:inherit;}
${selector(btnPrimaryClass)}{background:${cssVarRef("primary-base")};color:${cssVarRef("primary-text")};border-color:${cssVarRef("primary-base")};}
${selector(btnDangerClass)}{border-color:${cssVarRef("danger-base")};color:${cssVarRef("danger-base")};}
${selector(hintClass)}{color:${cssVarRef("muted")};}
${selector(errorClass)}{color:${cssVarRef("danger-base")};}
${selector(modalClass)}{position:fixed;inset:0;}
${selector(backdropClass)}{position:fixed;inset:0;z-index:${zValue("backdrop")};background:rgba(0,0,0,0.4);}
${selector(dialogClass)}{position:fixed;z-index:${zValue("overlay")};top:50%;left:50%;transform:translate(-50%,-50%);min-width:280px;max-width:90vw;padding:1.25rem;border-radius:10px;background:${cssVarRef("surface")};border:1px solid ${cssVarRef("border")};}
${selector(dialogActionsClass)}{display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;}
${selector(toasterClass)}{position:fixed;right:1rem;bottom:1rem;display:flex;flex-direction:column;gap:0.5rem;z-index:${zValue("overlay")};}
${selector(toastClass)}{display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.9rem;border-radius:8px;border:1px solid ${cssVarRef("border")};}
${selector(toastToneClass("success"))}{background:${cssVarRef("success-surface")};color:${cssVarRef("success-text")};border-color:${cssVarRef("success-border")};}
${selector(toastToneClass("danger"))}{background:${cssVarRef("danger-surface")};color:${cssVarRef("danger-text")};border-color:${cssVarRef("danger-border")};}
${selector(toastToneClass("warning"))}{background:${cssVarRef("warning-surface")};color:${cssVarRef("warning-text")};border-color:${cssVarRef("warning-border")};}
${selector(toastToneClass("info"))}{background:${cssVarRef("info-surface")};color:${cssVarRef("info-text")};border-color:${cssVarRef("info-border")};}
${selector(toastCloseClass)}{background:none;border:none;cursor:pointer;color:inherit;font-size:1.1rem;}
`;
