import coverage from './coverage.json';
import './surface.css';

function stateMessage(state){
  return state?.message||state?.description||state?.note||state?.reason||'این State از قرارداد Step 57 برای بازبینی ساختاری نمایش داده می‌شود.';
}

const storefrontStates=(coverage.screens||[]).filter(screen=>screen.area==='storefront').flatMap(screen=>(screen.states||[]).map((state,index)=>({screen,state,index})));
const adminStates=(coverage.screens||[]).filter(screen=>screen.area==='admin').flatMap(screen=>(screen.states||[]).map((state,index)=>({screen,state,index})));
const allStates=[...storefrontStates,...adminStates];

function StateCard({screen,state,index,batch=false}){
  const content=<>
    <div className="surface-body-heading"><h2>{state?.title||state?.id||'State قراردادی'}</h2><span className="sample">{index+1} / {(screen.states||[]).length}</span></div>
    {state?<>
      <p>{stateMessage(state)}</p>
      {state.action&&<p><strong>اقدام مورد انتظار:</strong> {state.action}</p>}
      <dl className="order-facts">
        <div><dt>Screen</dt><dd><bdi dir="ltr">{screen.id}</bdi></dd></div>
        <div><dt>State</dt><dd><bdi dir="ltr">{state.id||String(index)}</bdi></dd></div>
        <div><dt>Area</dt><dd>{screen.area}</dd></div>
      </dl>
    </>:<p role="status">این Screen در قرارداد State مستقلی ندارد.</p>}
    <p>این مسیر فقط State قراردادی را برای ممیزی قابل‌تکرار نمایش می‌دهد و مجوز اجرا، API call یا تغییر Runtime ایجاد نمی‌کند.</p>
  </>;
  if(batch)return <article className="surface-body kind-review" data-qa-state-key={`${screen.id}:${index}`} data-qa-screen={screen.id} data-qa-state-index={index} dir="rtl">{content}</article>;
  return <section className="surface-body kind-review" aria-label="بازبینی State قراردادی">{content}<a href={screen.area==='admin'?'/admin?id='+encodeURIComponent(screen.id):'/store?id='+encodeURIComponent(screen.id)}>بازگشت به صفحهٔ واقعی نمونه</a></section>;
}

export function QASurface(){
  const params=new URLSearchParams(location.search);
  if(params.get('batch')==='1'){
    const rawOffset=Number(params.get('offset')||0),rawLimit=Number(params.get('limit')||160);
    const offset=Number.isInteger(rawOffset)&&rawOffset>=0?rawOffset:0;
    const limit=Number.isInteger(rawLimit)&&rawLimit>0&&rawLimit<=200?rawLimit:160;
    const batch=allStates.slice(offset,offset+limit);
    return <div className="admin-surface" dir="rtl"><a className="skip" href="#qa-main">رفتن به محتوای اصلی</a><div className="surface-workspace"><header className="surface-header"><a href="/review">مرکز بازبینی</a><span>QA گروهی Step 57 · بدون درخواست واقعی</span></header><main id="qa-main" className="surface-main" data-qa-batch-offset={offset} data-qa-batch-count={batch.length}><p className="breadcrumb">QA / ممیزی گروهی Stateها</p><h1>ممیزی کامل Stateهای قراردادی</h1><p role="status">{batch.length.toLocaleString('fa-IR')} State از {allStates.length.toLocaleString('fa-IR')} State در این Batch رندر شده است.</p>{batch.map(item=><StateCard key={`${item.screen.id}:${item.index}`} {...item} batch/>)}</main></div></div>;
  }
  const requested=params.get('screen')||'SF-B-01';
  const screen=coverage.screens.find(item=>item.id===requested)||coverage.screens[0];
  const rawIndex=Number(params.get('stateIndex')||0);
  const states=Array.isArray(screen.states)?screen.states:[];
  const index=Number.isInteger(rawIndex)&&rawIndex>=0&&rawIndex<states.length?rawIndex:0;
  const state=states[index]||null;
  return <div className="admin-surface" dir="rtl">
    <a className="skip" href="#qa-main">رفتن به محتوای اصلی</a>
    <div className="surface-workspace">
      <header className="surface-header">
        <a href="/review">مرکز بازبینی</a>
        <span>QA فقط برای Step 57 · بدون درخواست واقعی</span>
      </header>
      <main id="qa-main" className="surface-main" data-qa-surface={screen.id} data-qa-state-index={index}>
        <p className="breadcrumb">QA / {screen.area==='admin'?'مدیریت':'فروشگاه'} / {screen.id}</p>
        <h1>{screen.title}</h1>
        <StateCard screen={screen} state={state} index={index}/>
      </main>
    </div>
  </div>;
}
