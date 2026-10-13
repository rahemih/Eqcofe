import { useEffect, useRef, type ReactNode } from "react";

export function ActionReviewDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive=false,
  busy=false,
  children,
  onConfirm,
  onClose
}:{
  open:boolean;
  title:string;
  description:string;
  confirmLabel:string;
  destructive?:boolean;
  busy?:boolean;
  children?:ReactNode;
  onConfirm:()=>void;
  onClose:()=>void;
}){
  const dialogRef=useRef<HTMLDialogElement|null>(null);
  const cancelRef=useRef<HTMLButtonElement|null>(null);

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(open&&!dialog.open){
      dialog.showModal();
      queueMicrotask(()=>cancelRef.current?.focus());
    }else if(!open&&dialog.open){
      dialog.close();
    }
  },[open]);

  return (
    <dialog
      ref={dialogRef}
      className="admin-review-dialog"
      aria-labelledby="admin-review-title"
      aria-describedby="admin-review-description"
      onCancel={(event)=>{event.preventDefault();if(!busy)onClose();}}
      onClose={()=>{if(open&&!busy)onClose();}}
    >
      <div className="admin-review-content">
        <p className="destination-kicker">بررسی اقدام محافظت‌شده</p>
        <h2 id="admin-review-title">{title}</h2>
        <p id="admin-review-description">{description}</p>
        {children}
        <div className="admin-review-actions">
          <button ref={cancelRef} type="button" onClick={onClose} disabled={busy}>انصراف</button>
          <button
            type="button"
            className={destructive?"admin-review-danger":undefined}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy?"در حال بررسی…":confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
