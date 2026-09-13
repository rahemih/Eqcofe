import {useState} from 'react';
import coverage from './coverage.json';
import './review.css';
export function Review(){
 const [query,setQuery]=useState(''),[area,setArea]=useState('all');
 const rows=coverage.screens.filter(s=>(area==='all'||s.area===area)&&`${s.title} ${s.id}`.includes(query));
 return <main className="review-home" dir="rtl"><p className="eyebrow">EQCOFE / قدم ۵۷</p><h1>مرکز بازبینی طراحی</h1><p>۱۳۴ سطح به منابع قبلی متصل شده‌اند. ثبت در این فهرست به معنی تکمیل طراحی یا تأیید صفحه نیست.</p><div className="review-links"><a href="/">نمونهٔ تأییدشدهٔ مدیریت کالا</a><a href="/scenarios.html">حالت‌های مدیریت کالا</a><a href="/flows">جریان‌های تعاملی فروشگاه</a></div><label>جست‌وجوی عنوان یا شناسه<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label>محدوده<select value={area} onChange={e=>setArea(e.target.value)}><option value="all">همه</option><option value="storefront">فروشگاه</option><option value="admin">مدیریت</option></select></label><p role="status">{rows.length.toLocaleString('fa-IR')} سطح</p><div className="coverage-grid">{rows.map(s=><article key={s.id}><span dir="ltr">{s.id}</span><h2>{s.title}</h2><p>{s.area==='admin'?'مدیریت':'فروشگاه'} · در انتظار تکمیل و بازبینی</p><small>{s.journeys.join(' / ')}</small>{<a className="surface-review-link" href={s.id==='AD-C-01'?'/':(s.area==='admin'?'/admin?id=':'/store?id=')+s.id}>باز کردن نمای طراحی</a>}</article>)}</div></main>;
}
