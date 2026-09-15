import coverage from './coverage.json';
import './surface.css';

function stateMessage(state){
  return state?.message||state?.description||state?.note||state?.reason||'این State از قرارداد Step 57 برای بازبینی ساختاری نمایش داده می‌شود.';
}

export function QASurface(){
  const params=new URLSearchParams(location.search);
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
        <section className="surface-body kind-review" aria-label="بازبینی State قراردادی">
          <div className="surface-body-heading"><h2>{state?.title||state?.id||'State قراردادی'}</h2><span className="sample">{index+1} / {states.length}</span></div>
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
          <a href={screen.area==='admin'?'/admin?id='+encodeURIComponent(screen.id):'/store?id='+encodeURIComponent(screen.id)}>بازگشت به صفحهٔ واقعی نمونه</a>
        </section>
      </main>
    </div>
  </div>;
}
