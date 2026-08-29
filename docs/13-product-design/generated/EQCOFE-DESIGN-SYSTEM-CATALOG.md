# EQCOFE — Repository Design-System Catalog

این فایل به‌صورت قطعی از `docs/13-product-design/step54-design-system-contract.json` تولید می‌شود و نباید دستی ویرایش شود. مخزن منبع Canonical است؛ Figma Starter فقط Mirror رایگان و غیرمسدودکننده است.

## خلاصه کتابخانه

| مورد | تعداد |
|---|---:|
| رنگ Primitive | 35 |
| نقش Semantic | 19 |
| Token متریک | 34 |
| سبک تایپوگرافی | 13 |
| خانواده Component | 13 |
| خانواده State | 8 |

## Component API

| Component | Variant axes | ترکیب‌های قراردادی | الزامات دسترس‌پذیری |
|---|---|---:|---|
| Button | style: primary، secondary، tertiary، danger<br>size: sm، md، lg<br>state: default، hover، focus، disabled، loading | 60 | accessible name؛ visible focus؛ loading announcement؛ disabled semantics |
| IconButton | style: standard، danger<br>size: md، lg<br>state: default، hover، focus، disabled | 16 | mandatory accessible name؛ tooltip not sole name؛ 44px target |
| TextField | state: default، focus، filled، error، disabled، read-only<br>density: comfortable، compact | 12 | persistent label؛ help association؛ error association؛ required text |
| Select | state: default، focus، filled، error، disabled<br>density: comfortable، compact | 10 | keyboard operation؛ announced value؛ label and error association |
| ChoiceControl | type: checkbox، radio، switch<br>state: off، on، mixed، focus، disabled | 15 | native semantics؛ visible label؛ group legend؛ state announcement |
| Badge | tone: neutral، info، success، warning، danger، special<br>emphasis: subtle، strong | 12 | text label؛ never color-only |
| Alert | tone: info، success، warning، danger<br>action: none، single | 8 | icon plus heading/text؛ role selected by urgency؛ dismiss accessible name |
| Card | surface: plain، outlined، elevated<br>interactive: false، true | 6 | single clear target؛ heading hierarchy؛ focus when interactive |
| Dialog | severity: standard، danger<br>width: sm، md، lg | 6 | labelled title؛ described content؛ focus trap؛ focus return؛ escape policy |
| Tabs | style: line، contained<br>state: default، focus، disabled | 6 | roving tabindex؛ arrow keys follow RTL intent؛ selected state |
| Pagination | mode: pages، cursor | 2 | nav label؛ current page؛ previous/next names follow reading direction |
| DataTable | density: comfortable، compact<br>selection: none، single، multiple | 6 | header associations؛ caption or accessible name؛ sort state؛ keyboard action alternative |
| StatePanel | state: loading، empty، no-result، error، offline، denied، unknown-result | 7 | meaningful heading؛ bounded next action؛ status announcement؛ no fake success |

## مرز استفاده

این Catalog قرارداد طراحی است، نه پیاده‌سازی Frontend. Wireframe، Prototype و Runtime Component در Stepهای بعدی ساخته می‌شوند.
