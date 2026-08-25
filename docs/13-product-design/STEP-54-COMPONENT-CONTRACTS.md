# Step 54 — Component, Form & State Contracts

**Status:** COMPLETE / A7–A9 GATE PASS

## API مشترک Component

هر Component باید نام پایدار، Variant محدود، State کامل، Semantic token binding، RTL behavior و Accessibility contract داشته باشد. Stateهای hover، focus، disabled و loading رفتار هستند و نباید با یک Variant تزئینی اشتباه شوند. Matrix بیش از 30 ترکیب به sub-component شکسته می‌شود.

## خانواده‌ها

| خانواده | Componentهای پایه | قرارداد کلیدی |
|---|---|---|
| Action | Button، IconButton، Link | نام روشن، Focus visible، Loading اعلام‌شده، Danger جدا |
| Form | TextField، Select، ChoiceControl | Label پایدار، Help/Error association، Keyboard و Required text |
| Feedback | Badge، Alert، StatePanel | متن و Icon همراه Tone؛ موفقیت جعلی ممنوع |
| Surface | Card، Dialog | Heading منطقی، Focus management، Layer واضح |
| Navigation | Tabs، Pagination | Current/selected state، RTL intent، Keyboard pattern |
| Data | DataTable | Header association، Sort state، bounded pagination، action alternative |

Variant و State دقیق هر خانواده در Contract JSON ثبت شده است.

## Form contract

1. Label همیشه visible است و Required/Optional را با متن بیان می‌کند.
2. Help پیش از Error قابل دسترسی است؛ Error هم در Summary و هم کنار Field با ID association نمایش داده می‌شود.
3. Client validation جای Server validation نیست. Conflict مقدار واردشده را حفظ و تفاوت با مقدار authoritative را توضیح می‌دهد.
4. Submit در حال اجرا lock می‌شود، اما Cancel/Status check طبق Flow باقی می‌ماند؛ Replay idempotent به‌عنوان Duplicate failure نشان داده نمی‌شود.
5. Password/OTP/Step-Up داده حساس را Log یا در Error echo نمی‌کند.
6. Persian keyboard و Paste برای Phone/Code/Number normalization پشتیبانی می‌شود و مقدار خامِ قابل‌ابهام قبل از Submit روشن است.

## StatePanel contract

| State | پیام | اقدام |
|---|---|---|
| loading/progressive | چه چیزی در حال انجام است | Cancel فقط اگر امن است |
| empty/first-use | چرا داده وجود ندارد | اقدام شروع مرتبط |
| no-result/filtered | Filter مؤثر چیست | پاک‌کردن یا تغییر Filter |
| error/failed | مشکل و اثر | Retry bounded یا بازگشت امن |
| offline/timeout | اتصال/زمان پاسخ | وضعیت یا Retry کنترل‌شده |
| denied/step-up | ورود، Permission یا احراز مجدد | مسیر دقیق بعدی |
| unknown-result | نتیجه authoritative نامشخص | Status check؛ نه Success |

## Commerce و Admin

- Money با Toman، Tabular numerals و line wrapping امن نمایش داده می‌شود.
- Price change، Refund، Restore و Config change ابتدا Preview/Review دارند.
- DataTable بدون Pagination/Bound نیست و bulk selection دامنه و تعداد را اعلام می‌کند.
- Permission-aware Navigation فقط Hint است؛ 401/403/404 Server-side باقی می‌ماند.
- Action terminal یا destructive Confirmation عمومی ندارد؛ دامنه اثر، irreversibility و Reference را نشان می‌دهد.
- Customer و Staff shell Component token مشترک دارند اما Session/Navigation/Authorization context مشترک ندارند.

