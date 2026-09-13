import {useRef,useState} from 'react';

export function ArchiveReview({product}) {
 const dialog=useRef(null),cancel=useRef(null),reasonInput=useRef(null);
 const [reason,setReason]=useState(''),[error,setError]=useState(''),[reviewed,setReviewed]=useState(false);
 function open(){setReason('');setError('');dialog.current.showModal();cancel.current.focus();}
 function review(e){e.preventDefault();if(!reason.trim()){setError('دلیل آرشیو را وارد کنید.');reasonInput.current.focus();return;}dialog.current.close();setReviewed(true);}
 return <section className="review-panel" aria-label="بررسی آرشیو">
  <h2>بررسی آرشیو کالا</h2><p>نمونهٔ تأیید اقدام؛ هیچ کالا یا وضعیت فروشی در سامانه تغییر نمی‌کند.</p>
  <button onClick={open} disabled={!product}>بررسی آرشیو {product?.name}</button>
  <p role="status">{reviewed?'بررسی آزمایشی پایان یافت؛ آرشیو واقعی انجام نشد.':''}</p>
  <dialog ref={dialog} aria-labelledby="archive-title" aria-describedby="archive-impact">
   <h2 id="archive-title">آرشیو {product?.name}</h2>
   <p id="archive-impact">با آرشیو، فروش این کالا متوقف می‌شود. خروج از آرشیو، کالا را به پیش‌نویس برمی‌گرداند و انتشار یا فروش را خودکار فعال نمی‌کند.</p>
   <form onSubmit={review} noValidate><label htmlFor="archive-reason">دلیل آرشیو</label>
    <input id="archive-reason" ref={reasonInput} value={reason} maxLength={500} onChange={e=>{setReason(e.target.value);if(e.target.value.trim())setError('');}} aria-invalid={!!error} aria-describedby={error?'archive-error':undefined}/>
    {error&&<p id="archive-error" className="error" role="alert">{error}</p>}
    <p>این مرحله فقط مرور تأیید است؛ دکمهٔ زیر درخواست آرشیو ارسال نمی‌کند.</p>
    <div className="dialog-actions"><button type="button" ref={cancel} onClick={()=>dialog.current.close()}>انصراف</button><button className="primary" type="submit">تأیید آزمایشی</button></div>
   </form>
  </dialog>
 </section>;
}
