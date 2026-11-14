# TestPlatform – Onlayn Matematika Nazorat Ishlari va Testlar Tizimi

Matematika fani o'qituvchilari uchun mo'ljallangan zamonaviy, xavfsiz va to'liq avtomatlashtirilgan onlayn nazorat ishlari platformasi.

---

## 1. Loyiha Haqida

Ushbu platforma yordamida o'qituvchi KaTeX matematik formulalari (`$...$`), variantli va yozma (ochiq) savollardan iborat nazorat ishlarini yaratadi va o'quvchilarga qisqa havola (`/t/[code]`) taqdim etadi. O'quvchilar hisob ochmasdan, o'z F.I.SH larini kiritib test topshiradilar.

Test jarayonida sahifadan chiqish, boshqa ilovalarga o'tish (kalkulyator, sun'iy intellekt, messenjerlar), to'liq ekrandan chiqish holatlari darhol aniqlanadi, serverga soniyasigacha yoziladi va ruxsat etilgan limitdan oshganda test avtomatik yakunlanadi.

---

## 2. Texnologiyalar

- **Frontend / Backend**: Next.js 14 (App Router) + TypeScript (strict mode)
- **Stillar**: Tailwind CSS (Default qora **Dark mode**, oq **Light mode**, binafsha `#8b5cf6` aksent rang, 100dvh, to'liq 360px+ mobil moslashuv)
- **Ma'lumotlar bazasi**: Supabase (PostgreSQL, Row Level Security, Storage)
- **Matematik formulalar**: KaTeX (`katex`, `MathRenderer`) va mobil matematik klaviatura (`MathKeyboard`)
- **Anti-Cheat Guard**: `useExamGuard` (visibility, window blur, fullscreen, broadcast multi-tab, clipboard block, server heartbeat)
- **Birlik testlari**: Vitest
- **Til**: O'zbek tili (Lotin alifbosida, barcha matnlar markazlashgan `src/lib/i18n.ts` faylida)

---

## 3. O'rnatish va Ishga Tushirish

### 1. Repozitoriyani klonlash va paketlarni o'rnatish:
```bash
git clone https://github.com/Artikov-dev/Altiora-math.git
cd Altiora-math
npm install --legacy-peer-deps
```

### 2. Muhit o'zgaruvchilari (`.env.local`):
Loyiha ildizida `.env.local` faylini yarating va quyidagi o'zgaruvchilarni kiriting (namuna: `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
> [!IMPORTANT]
> `SUPABASE_SERVICE_ROLE_KEY` faqat server API yo'llarida ishlatiladi va hech qachon brauzerga yoki ommaviy repozitoriyaga chiqarilmaydi. `.env.local` fayli `.gitignore` orqali qat'iy himoyalangan.

### 3. Dasturni ishga tushirish:
```bash
npm run dev
```
Brauzerda `http://localhost:3000` manzilini oching.

---

## 4. Supabase Sozlamalari va Baza Migratsiyasi

Platforma ma'lumotlar bazasi **to'liq toza (bo'sh)** holda ishga tushiriladi (hech qanday soxta yoki demo testlar mavjud emas).

1. Supabase loyihangizga kiring ([supabase.com](https://supabase.com)).
2. Chap menyudan **SQL Editor** bo'limini tanlang.
3. Loyihadagi `supabase/migrations/01_schema.sql` fayli tarkibini nusxalab, SQL Editor oynasiga joylang va **Run** tugmasini bosing.
4. Ushbu skript barcha kerakli jadvallar (`teachers`, `tests`, `questions`, `question_options`, `attempts`, `answers`, `violations`), RLS qoidalari, indekslar va yechim rasmlari uchun `test-photos` Storage saqlagichini yaratadi.

---

## 5. Ilk O'qituvchi Akkauntini Yaratish

Tizimda ochiq o'qituvchi ro'yxatdan o'tish sahifasi mavjud emas (xavfsizlik talabiga binoan). O'qituvchi akkauntlari faqat administrator tomonidan Supabase orqali yaratiladi:

1. Supabase Dashboard → **Authentication** → **Users** bo'limiga kiring.
2. **Add user** → **Create user** tugmasini bosing.
3. O'qituvchining elektron pochtasi va parolini kiriting (masalan: `ustoz@maktab.uz`, `parol123`).
4. **Auto Confirm User?** belgisini yoqing va foydalanuvchini yarating.
5. Saytda `/teacher/login` manziliga o'ting va ushbu email/parol orqali boshqaruv paneliga kiring.

---

## 6. Anti-Cheat Tizimi Qanday Ishlaydi?

`useExamGuard` moduli quyidagi qoidabuzarliklarni aniqlaydi va soniyasigacha o'lchab qayd etadi:

1. **Tab yoki ilova almashtirish (App Switch / Minimize)**:
   - `document.visibilitychange` va `window.blur` orqali sahifa fonda qolgan vaqt (`duration_ms`) o'lchanadi va qaytgan zahoti serverga yoziladi.
2. **To'liq ekrandan (Fullscreen) chiqish**:
   - Desktop va Android qurilmalarda to'liq ekran talab qilinganda, ekrandan chiqilsa bloklovchi oyna ko'rsatiladi. iOS Safari'da esa moslashuvchan ravishda tekshiriladi.
3. **Nusxa ko'chirish va kontekst menyuni bloklash**:
   - Savollar maydonida matn tanlash (`user-select: none`), nusxa olish (`copy`, `cut`), joylash (`paste`) va sichqoncha o'ng tugmasi (`contextmenu`) bloklangan.
4. **Taqiqlangan tugmalar**:
   - `Ctrl/Cmd + C, V, X, A, P, S, U`, `F12`, `Ctrl+Shift+I/J/C` va `PrintScreen` bloklanadi.
5. **Bir nechta oynada ochish (Multi-tab)**:
   - `BroadcastChannel` orqali bitta urinish boshqa oynada ochilsa darhol aniqlanadi.
6. **Yurak urishi (Heartbeat)**:
   - Har 12 soniyada serverga ping yuboriladi. Aloqa 60 soniyadan ko'p uzilsa, shubhali faolsizlik deb qayd etiladi.
7. **Ogohlantirish va Avto-topshirish**:
   - Qoidabuzarlik sodir bo'lganda savollar blurlanadi va ogohlantirish modali chiqadi.
   - O'qituvchi belgilagan limit (standart: 3) tugagach, test zudlik bilan server tomonidan `auto_submitted` holatiga o'tkaziladi.

---

## 7. Ma'lum Cheklovlar (Known Limitations)

Veb-platforma sifatida tizimning ob'ektiv cheklovlari mavjud:
- **Ikkinchi jismoniy qurilma**: Talaba yonidagi ikkinchi telefon, qog'oz kitob yoki konspektdan foydalansa, veb-brauzer buni jismonan ko'ra olmaydi.
- **Tizim vazifasi**: Ilovalarni jismonan bloklash emas (veb-sayt bunga ega emas), balki har qanday chiqish va begona harakatni aniqlab, soniyasigacha jurnallashtirish hamda o'qituvchiga ishonchli audit-treyl taqdim etishdir.

---

## 8. Birlik Testlarini Ishga Tushirish

Javoblarni matematik normallashtirish (`0,5` == `0.5`, `1/2` == `0.50`, bag'rikenglik oralig'i) va seedli deterministik aralashtirish funksiyalarini sinash:
```bash
npm run test
```

---

## 9. Vercel'ga Joylash (Deployment)

1. Loyihani GitHub'ga yuklang: `https://github.com/Artikov-dev/Altiora-math`.
2. [Vercel.com](https://vercel.com) ga kiring va GitHub repozitoriyani import qiling.
3. **Environment Variables** bo'limida quyidagi o'zgaruvchilarni kiriting:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy** tugmasini bosing.

---

## English Summary

**TestPlatform** is a modern, anti-cheat protected online math examination platform built for teachers and students using Next.js 14 (App Router), TypeScript, Tailwind CSS, KaTeX, and Supabase.

- **Teacher Experience**: Create custom math tests with KaTeX formulas (`$...$`), configure cheating limits, view live submission stats, grade handwritten solutions, review a detailed chronological violation log (audit trail), reset attempts, and export results to UTF-8 CSV.
- **Student Experience**: Take tests on mobile or desktop (responsive 360px+, 100dvh, dark/light themes), use on-screen math keyboard helpers, with authoritative server-side countdown timers and debounced autosave.
- **Anti-Cheat Focus Guard**: Detects app switching, tab switching, window blurring, fullscreen exit, multi-tab abuse, and blocked shortcuts with an automatic submission penalty once the violation limit is exceeded.
