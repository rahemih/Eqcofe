import { Form, Link, Outlet, useLocation } from "react-router";
import { useMemo, useState } from "react";
import type { ApiComponents } from "../platform/api/contract";
import type { PermittedAdminGroup } from "../navigation/destination-policy";
import { getAdminMessages } from "../i18n";

type AdminActor=ApiComponents["schemas"]["AdminSessionActor"];
type AssignedScope={type:"warehouse"|"physical_store";id:string;value:string};

export type AdminShellOutletContext={groups:readonly PermittedAdminGroup[]};

export function AdminShell({actor,scopes,groups}:{actor:AdminActor;scopes:readonly AssignedScope[];groups:readonly PermittedAdminGroup[]}) {
  const messages=getAdminMessages();
  const location=useLocation();
  const [query,setQuery]=useState("");
  const normalizedQuery=normalizeSearch(query);
  const allDestinations=useMemo(()=>groups.flatMap((group)=>group.destinations),[groups]);
  const searchResults=useMemo(()=>{
    if(!normalizedQuery)return [];
    return allDestinations
      .filter((destination)=>normalizeSearch(`${destination.label} ${destination.surface}`).includes(normalizedQuery))
      .slice(0,12);
  },[allDestinations,normalizedQuery]);
  const currentSurface=readCurrentSurface(location.pathname);

  return (
    <>
      <a className="admin-skip-link" href="#admin-main">{messages.skipToMain}</a>
      <div className="admin-frame">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">زمینهٔ دسترسی تأییدشدهٔ سرور</p>
            <p className="admin-brand">{messages.brand}</p>
          </div>
          <div className="admin-session-summary">
            <span className="admin-stage-badge" aria-label="مرحله جاری">67-H</span>
            <span className="admin-actor" title="نشست تأییدشده">مدیر <bdi>{actor.id}</bdi></span>
            <Link className="admin-security-link" to="/security-keys" aria-current={location.pathname==="/security-keys"?"page":undefined}>کلیدهای امنیتی</Link>
            <Form method="post" action="/logout">
              <button className="admin-logout-button" type="submit">خروج امن</button>
            </Form>
          </div>
        </header>

        <aside className="admin-sidebar">
          <nav aria-label={messages.navigationLabel}>
            <div className="admin-nav-heading">
              <p className="admin-nav-title">{messages.navigationLabel}</p>
              <Link className="admin-home-link" to="/" aria-current={location.pathname==="/"?"page":undefined}>نمای کلی</Link>
            </div>

            <label className="admin-destination-search">
              <span>جستجوی مقصد مجاز</span>
              <input
                type="search"
                value={query}
                onChange={(event)=>setQuery(event.currentTarget.value)}
                placeholder="عنوان یا شناسهٔ سطح"
                autoComplete="off"
              />
            </label>

            {normalizedQuery?(
              <div className="admin-search-results" role="region" aria-live="polite" aria-label="نتیجه جستجوی مقصد">
                {searchResults.length?(
                  <ul>
                    {searchResults.map((destination)=>(
                      <li key={destination.surface}>
                        <Link to={destinationHref(destination.surface)} aria-current={currentSurface===destination.surface?"page":undefined}>
                          <span>{destination.label}</span>
                          <bdi>{destination.surface}</bdi>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ):<p className="admin-search-empty">مقصد مجازی با این عنوان پیدا نشد.</p>}
              </div>
            ):(
              <div className="admin-nav-groups">
                {groups.map((group)=>(
                  <details key={group.id} open={group.destinations.some((destination)=>destination.surface===currentSurface)}>
                    <summary>{group.label}</summary>
                    <ul>
                      {group.destinations.map((destination)=>(
                        <li key={destination.surface}>
                          <Link to={destinationHref(destination.surface)} aria-current={currentSurface===destination.surface?"page":undefined}>
                            <span>{destination.label}</span>
                            <bdi>{destination.surface}</bdi>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </nav>

          <section className="admin-scope-context" aria-labelledby="admin-scope-title">
            <h2 id="admin-scope-title">دامنهٔ نشست</h2>
            {scopes.length?(
              <ul>
                {scopes.map((scope)=>(
                  <li key={scope.value}>
                    <span>{scope.type==="warehouse"?"انبار":"فروشگاه حضوری"}</span>
                    <bdi>{scope.id}</bdi>
                  </li>
                ))}
              </ul>
            ):<p>دامنهٔ اختصاصی ثبت نشده است؛ این نمایش هیچ مجوزی ایجاد نمی‌کند.</p>}
            <p className="admin-scope-note">دامنه‌ها فقط از سرور خوانده می‌شوند و در این مرحله قابل تغییر نیستند.</p>
          </section>
        </aside>

        <main id="admin-main" className="admin-main" tabIndex={-1}>
          <Outlet context={{groups}} />
        </main>
      </div>
    </>
  );
}

function destinationHref(surface:string):string{
  if(surface==="AD-C-01")return "/catalog/products";
  if(surface==="AD-C-03")return "/catalog/structure/attributes";
  if(surface==="AD-C-05")return "/catalog/structure/brands";
  if(surface==="AD-C-06")return "/catalog/structure/categories";
  if(surface==="AD-C-07")return "/catalog/media";
  if(surface==="AD-C-08")return "/catalog/sales-control";
  return `/destinations/${encodeURIComponent(surface)}`;
}
function readCurrentSurface(pathname:string):string|null{
  if(pathname==="/catalog/media")return "AD-C-07";
  if(pathname==="/catalog/sales-control")return "AD-C-08";
  if(/\/catalog\/products\/[^/]+\/media$/.test(pathname))return "AD-C-04";
  if(pathname.startsWith("/catalog/structure/attributes")||/\/catalog\/products\/[^/]+\/attributes$/.test(pathname))return "AD-C-03";
  if(pathname.startsWith("/catalog/structure/brands"))return "AD-C-05";
  if(pathname.startsWith("/catalog/structure/categories"))return "AD-C-06";
  if(pathname==="/catalog/products"||pathname.startsWith("/catalog/products/"))return "AD-C-01";
  const match=/^\/destinations\/([^/]+)$/.exec(pathname);
  if(!match)return null;
  try{return decodeURIComponent(match[1]??"").toUpperCase();}catch{return null;}
}
function normalizeSearch(value:string):string{
  return value.normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\u064B-\u065F\u0670]/g,"").replace(/\s+/g," ").trim().toLocaleLowerCase("fa-IR");
}
