# 🤖 Telegram Sotuv Manager Boti

Node.js va Telegraf kutubxonasida yaratilgan sotuv va mijozlar arizalarini qabul qilish menejer boti.

Mijozlar bot orqali anketa to'ldiradi, admin esa har bir tushgan arizani Telegram orqali qabul qilib, bitta tugma orqali nomzodga O‘zbekcha va Inglizcha formatdagi **Tasdiqlash** yoki **Rad etish** xabarlarini yuborishi mumkin.

---

## 📌 Asosiy imkoniyatlari

### 👤 Foydalanuvchilar (Mijozlar) uchun:
1. **/start**: Salomlashish va asosiy menyu:
   - 📝 **Anketa to'ldirish**
   - 📞 **Bog'lanish**
   - ❓ **Savollar**
2. **Anketa to'ldirish (Wizard)**:
   - Ism so'raladi
   - Telefon raqam so'raladi (Tugma orqali yuborish yoki yozish imkoniyati)
   - Til sertifikati so'raladi (IELTS yoki Duolingo, ballari bilan yozish yoki tugma orqali tanlash)
   - Anketa yakunida tasdiqlash xabari: *"Arizangiz ko'rib chiqilmoqda yaqin soatlarda administratorimiz siz bilan bog'lanadi !"*
3. **Bog'lanish**:
   - Telegram: `@OnewaysconsultingHelp`
   - Telefon: `+998947363653`
   - Ish vaqti: `24/7`
4. **Savollar**:
   - Ko'p beriladigan savol va javoblar (IELTS / Duolingo sertifikati talab etilishi haqida).

---

### 👨‍💼 Administrator uchun:
1. **/admin buyrug'i**:
   - Botdan foydalangan jami odamlar soni
   - Jami kelib tushgan arizalar soni
   - Ko'rib chiqilishi kutilayotgan, tasdiqlangan va rad etilgan arizalar statistikasi
2. **Yangi arizalarni qabul qilish**:
   - Har bir yangi arizada mijozning barcha ma'lumotlari adminga keladi.
   - Har bir xabar ostida ikkita tugma bo'ladi:
     - `✅ Tasdiqlash`
     - `❌ Rad etish`
3. **Tugmalar bosilganda mijozga boradigan xabarlar**:
   - **Tasdiqlash bosilganda**:
     ```text
     O‘zbekcha:
     Assalomu alaykum! Hamkorligingiz uchun rahmat.
     Sizning nomzodingiz talablarimizga to‘liq mos keldi ✅
     Keyingi bosqichga o‘tish uchun IELTS yoki Duolingo sertifikatingizni @OnewaysconsultingHelp profiliga yuboring.
     Sertifikat haqiqiyligi tekshirilib tasdiqlangach, xizmatlarimiz bo‘yicha to‘liq ma’lumot taqdim etamiz.

     English:
     Hello! Thank you for your cooperation.
     You have successfully met our requirements ✅
     To proceed, please send your IELTS or Duolingo certificate to @OnewaysconsultingHelp.
     Once your certificate is verified, we will provide you with full details about our services.
     ```
   - **Rad etish bosilganda**:
     ```text
     Afsuski, bu safar sizning ko‘rsatkichlaringiz talablarimizga to‘liq mos kelmadi ❌
     Shu sababli hozirgi bosqichda sizga xizmat ko‘rsata olmaymiz. Kelgusidagi o‘qish va faoliyatingizda muvaffaqiyatlar tilaymiz!
     Savollaringiz bo‘lsa, @OnewaysconsultingHelp orqali bog‘lanishingiz mumkin.

     English:
     Hello! Thank you for your interest and cooperation.
     Unfortunately, your profile does not meet our requirements at this time ❌
     Therefore, we are unable to proceed with our services for this intake. We wish you the best of luck in your future academic and professional endeavors!
     If you have any questions, feel free to reach out to @OnewaysconsultingHelp
     ```
   - Bir marta tugma bosilgach, xabar holati yangilanadi va tugmalar qayta bosilmasligi uchun olib tashlanadi.

---

## 🛠 O'rnatish va Ishga tushirish

### 1. Talablar:
- [Node.js](https://nodejs.org/) (v16 yoki undan yuqori)

### 2. Bog'liqliklarni o'rnatish:
Loyiha papkasida terminalni oching va quyidagi buyruqni bering:
```bash
npm install
```

### 3. Telegram Bot va Admin Chat ID olish:
1. **Bot Token olish**:
   - Telegramda [@BotFather](https://t.me/BotFather) botiga kiring.
   - `/newbot` buyrug'ini yuboring va ko'rsatmalarga asosan bot nomini kiriting.
   - Yakunda sizga berilgan **HTTP API Token**ni nusxalab oling.
2. **Admin Chat ID olish**:
   - Telegramda [@userinfobot](https://t.me/userinfobot) botiga kiring va `/start` bosing.
   - Bot sizga `Id: 123456789` shaklida raqam beradi. Ushbu raqam sizning `ADMIN_CHAT_ID` hisoblanadi.

### 4. Sozlamalarni sozlash (`.env`):
Loyihadagi `.env` faylini oching va qiymatlarni o'zgartiring:
```env
BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
ADMIN_CHAT_ID=123456789
```

### 5. Botni ishga tushirish:
```bash
npm start
```
yoki to'g'ridan-to'g'ri:
```bash
node index.js
```

---

## 📂 Loyiha tuzilishi

```
├── index.js          # Asosiy bot logikasi, menyular, Wizard sahnasi va admin boshqaruvi
├── database.js       # JSON asosidagi ma'lumotlar bazasi (foydalanuvchilar va arizalar)
├── package.json      # Loyiha ma'lumotlari va kerakli kutubxonalar (telegraf, dotenv)
├── .env              # Maxfiy sozlamalar (Token va Admin ID)
├── .env.example      # Namuna sozlama fayli
├── .gitignore        # Git uchun e'tiborga olinmaydigan fayllar
└── README.md         # Loyiha qo'llanmasi
```

---

## 🚀 Serverda doimiy (24/7) ishlatish (PM2)

Agar botni VPS / Linux serverda 24/7 rejimda to'xtovsiz ishlatmoqchi bo'lsangiz:
```bash
# PM2 dasturini global o'rnatish
npm install -g pm2

# Botni PM2 orqali ishga tushirish
pm2 start index.js --name "sales-bot"

# Bot holatini ko'rish
pm2 status

# Bot loglarini ko'rish
pm2 logs sales-bot
```
