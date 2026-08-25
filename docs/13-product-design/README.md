# EQCOFE Product Design Canonical Artifacts

این پوشه مرجع طراحی محصول از Step 53 به بعد است. اسناد این پوشه باید از Product Vision، Business Rules، قرارداد HTTP و Evidence واقعی Repository مشتق شوند؛ تصمیم‌های بصری مراحل بعد نباید به عقب بازگردانده و به‌عنوان تصمیم Step 53 ثبت شوند.

## Step 53 boundary

Step 53 فقط معماری اطلاعات، ناوبری، Actorها، سفرهای انتها‌به‌انتها، وضعیت‌های قابل مشاهده و Traceability را تثبیت می‌کند. در این مرحله هیچ تصمیمی درباره رنگ، تایپوگرافی، spacing، component، breakpoint، wireframe، high-fidelity UI یا frontend implementation گرفته نمی‌شود.

## Canonical artifacts

- `STEP-53-INFORMATION-ARCHITECTURE.md`: ساختار ناوبری Storefront و Admin و قواعد یافتن مسیر.
- `STEP-53-USER-JOURNEYS.md`: سفرهای Storefront، Checkout، Account، After-sales و Wholesale.
- `STEP-53-ADMIN-EXPERIENCE.md`: گروه‌بندی Admin و سفرهای عملیاتی permission-aware.
- `STEP-53-STATE-AND-TRACEABILITY.md`: واژگان وضعیت، دسترس‌پذیری و اتصال به قواعد/قراردادها.
- `step53-experience-contract.json`: Contract ماشین‌خوان Step 53؛ منبع Validator و شناسه‌های پایدار Journey.

نمای کلان قابل‌ویرایش نیز در [EQCOFE Step 53 — Information Architecture](https://www.figma.com/board/3UPcK6wqP7k85YKw4xpYHi) نگهداری می‌شود. Figma مکمل دیداری است؛ Repository مرجع Canonical باقی می‌ماند.

## Change rule

هر تغییر بعدی باید یکی از این سه نوع باشد: اصلاح خطای اثبات‌شده در Traceability، تصمیم صریح Roadmap بعدی، یا refinement در Step مربوط به Design System/Wireframe. تغییر Business Rule یا افزودن API از این پوشه مجاز نیست. در تعارض، Product Vision و Business Rules برای قصد محصول و OpenAPI روی `main` برای قابلیت Backend مرجع هستند.
