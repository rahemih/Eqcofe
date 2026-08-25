# Step 54 — RTL, Grid & Responsive Foundation

**Status:** COMPLETE / A6 GATE PASS

## Grid

| دامنه | ستون | Margin | Gutter | کاربرد |
|---|---:|---:|---:|---|
| Compact | 4 | 16px | 16px | تلفن و پنل باریک |
| Tablet | 8 | 24px | 24px | تبلت و Split view |
| Desktop | 12 | 32px | 24px | Storefront/Admin |

عرض محتوا حداکثر 1280px است. Breakpointها برای تغییر ظرفیت Layout هستند، نه نام دستگاه: 360، 600، 840، 1200 و 1440px. Component باید Content-driven بماند و به Width ثابت صفحه وابسته نشود.

## RTL contract

1. Layout با logical properties مانند inline-start/end و block-start/end تعریف می‌شود.
2. ترتیب Source/DOM و Tab بر اساس معنی است؛ `row-reverse` برای جبران ترتیب اشتباه محتوا مجاز نیست.
3. Previous/Next، Chevron و Progression بر اساس جهت خواندن تفسیر می‌شوند؛ Media playback، Download، Check و Brand mark mirror نمی‌شوند.
4. متن Latin، URL، شماره سفارش و Hash در Bidi isolate قرار می‌گیرند.
5. Tooltip، Popover و Menu با collision detection در هر دو سمت کار می‌کنند.
6. Scrollbar، Sticky column و Frozen action نباید محتوای inline-start را بپوشانند.

## Responsive behavior

- Navigation سطح بالا در Compact به disclosure قابل‌دسترسی تبدیل می‌شود؛ مقصد اصلی حذف نمی‌شود.
- چندستونه به ترتیب اولویت محتوا collapse می‌شود؛ Summary و Action حیاتی پیش از محتوای کم‌اولویت می‌مانند.
- Table یا به Card/List معادل تبدیل می‌شود یا Scroll افقی bounded با Header/Row context حفظ می‌کند.
- Dialog در Compact می‌تواند Full-height Drawer شود، اما Focus management و Action order ثابت می‌ماند.
- Sticky action باید Focus را نپوشاند و فضای safe-area را رعایت کند.
- Touch target حداقل 44×44px و فاصلهٔ Actionهای خطرناک از Action عادی کافی است.

## Verification handoff

Steps 55–57 باید حداقل عرض‌های 320، 360، 600، 840، 1200 و 1440px، Zoom 400%، متن طولانی فارسی و Keyboard-only را روی Wireframe/Prototype بررسی کنند. Step 54 فقط Foundation و معیار پذیرش را تثبیت می‌کند.
