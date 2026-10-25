/**
 * ===================================================================
 * TELEGRAM SOTUV MANAGER BOTI
 * Dasturchi: Node.js va Telegraf kutubxonasida
 * ===================================================================
 * Ushbu bot mijozlardan arizalarni qabul qiladi, adminni xabardor
 * qiladi hamda admin tomonidan bir bosishda arizani tasdiqlash yoki
 * rad etish xabarlarini avtomatik yuborish imkoniyatini taqdim etadi.
 */

// Kerakli kutubxona va modullarni yuklash
require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { WizardScene, Stage } = Scenes;
const db = require('./database');

// 1. Muhit o'zgaruvchilarini tekshirish
const RAW_BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_TOKEN = RAW_BOT_TOKEN ? RAW_BOT_TOKEN.trim().replace(/:+$/, '') : '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? process.env.ADMIN_CHAT_ID.trim() : '';

if (!BOT_TOKEN || BOT_TOKEN === 'your_bot_token_here') {
    console.error('❌ XATOLIK: .env faylida BOT_TOKEN ko\'rsatilmagan!');
    console.error('Iltimos, .env faylini oching va Telegram bot tokeningizni kiriting.');
    process.exit(1);
}

if (!ADMIN_CHAT_ID || ADMIN_CHAT_ID === 'your_admin_chat_id_here') {
    console.warn('⚠️ DIQQAT: .env faylida ADMIN_CHAT_ID kiritilmagan yoki namunaviy qiymatda turibdi.');
    console.warn('Admin buyurtmalarni qabul qilishi uchun ADMIN_CHAT_ID ni kiriting (@userinfobot orqali bilsa bo\'ladi).');
}

// Bazani ishga tushirish (fayl mavjud bo'lmasa yaratiladi)
db.initDb();

// Bot obyektini yaratish
const bot = new Telegraf(BOT_TOKEN);

// ===================================================================
// MATNLAR VA SHABLONLAR
// ===================================================================

// Tasdiqlash xabari matni (O‘zbekcha va Inglizcha)
const APPROVAL_MESSAGE = `O‘zbekcha:
Assalomu alaykum! Hamkorligingiz uchun rahmat.
Sizning nomzodingiz talablarimizga to‘liq mos keldi ✅
Keyingi bosqichga o‘tish uchun IELTS yoki Duolingo sertifikatingizni @OnewaysconsultingHelp profiliga yuboring.
Sertifikat haqiqiyligi tekshirilib tasdiqlangach, xizmatlarimiz bo‘yicha to‘liq ma’lumot taqdim etamiz.

English:
Hello! Thank you for your cooperation.
You have successfully met our requirements ✅
To proceed, please send your IELTS or Duolingo certificate to @OnewaysconsultingHelp.
Once your certificate is verified, we will provide you with full details about our services.`;

// Rad etish xabari matni (O‘zbekcha va Inglizcha)
const REJECTION_MESSAGE = `Afsuski, bu safar sizning ko‘rsatkichlaringiz talablarimizga to‘liq mos kelmadi ❌
Shu sababli hozirgi bosqichda sizga xizmat ko‘rsata olmaymiz. Kelgusidagi o‘qish va faoliyatingizda muvaffaqiyatlar tilaymiz!
Savollaringiz bo‘lsa, @OnewaysconsultingHelp orqali bog‘lanishingiz mumkin.

English:
Hello! Thank you for your interest and cooperation.
Unfortunately, your profile does not meet our requirements at this time ❌
Therefore, we are unable to proceed with our services for this intake. We wish you the best of luck in your future academic and professional endeavors!
If you have any questions, feel free to reach out to @OnewaysconsultingHelp`;

// Kontakt ma'lumotlari
const CONTACT_INFO = `📞 Biz bilan bog'lanish:

• Telegram: @OnewaysconsultingHelp
• Telefon: +998947363653
• Ish vaqti: 24/7`;

// Ko'p beriladigan savollar
const FAQ_INFO = `❓ Ko'p beriladigan savollar:

Savol: "Til sertifikati kerak bo'ladimi ?"
Javob: "Albatta IELTS yoki Duolingo sertifikati talab etiladi"`;

// ===================================================================
// YORDAMCHI FUNKSIYALAR VA KLAVIATURALAR
// ===================================================================

/**
 * Asosiy menyu klaviaturasi
 */
function getMainMenuKeyboard() {
    return Markup.keyboard([
        ['📝 Anketa to\'ldirish'],
        ['📞 Bog\'lanish', '❓ Savollar']
    ]).resize();
}

/**
 * Vaqtni chiroyli formatda chiqarish
 */
function formatDateTime(isoString) {
    const date = isoString ? new Date(isoString) : new Date();
    return date.toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
}

/**
 * Yangi ariza tushganda adminga xabar va inline tugmalarni yuborish
 */
async function sendOrderToAdmin(telegram, order) {
    if (!ADMIN_CHAT_ID) {
        console.warn('⚠️ ADMIN_CHAT_ID belgilanmagan, arizani adminga yuborib bo\'lmadi.');
        return;
    }

    let adminMessage = `🆕 Yangi buyurtma kelib tushdi! (#${order.id})

👤 Ismi: ${order.name}
📞 Telefon: ${order.phone}
📜 Til sertifikati: ${order.certificate || 'Ko\'rsatilmagan'}`;

    if (order.service && order.service !== 'Ko\'rsatilmagan') {
        adminMessage += `\n🛠 Xizmat: ${order.service}`;
    }
    if (order.comment && order.comment !== 'Mavjud emas' && order.comment !== 'Izoh qoldirilmagan') {
        adminMessage += `\n💬 Qo'shimcha izoh: ${order.comment}`;
    }

    adminMessage += `\n\n🔗 Foydalanuvchi: ${order.username} (ID: ${order.userId})\n📅 Yuborilgan vaqti: ${formatDateTime(order.createdAt)}`;

    const inlineKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Tasdiqlash', `accept_${order.id}`),
            Markup.button.callback('❌ Rad etish', `reject_${order.id}`)
        ]
    ]);

    try {
        await telegram.sendMessage(ADMIN_CHAT_ID, adminMessage, inlineKeyboard);
    } catch (error) {
        console.error('Adminga xabar yuborishda xatolik yuz berdi:', error);
    }
}

// ===================================================================
// ANKETA TO'LDIRISH UCHUN WIZARD SCENE (KETMA-KET SO'ROVNOMA)
// ===================================================================

const anketaWizard = new WizardScene(
    'anketa-wizard',

    // 1-QADAM: Ismni so'rash
    async (ctx) => {
        await ctx.reply(
            'Ismingiz nima?',
            Markup.keyboard([['❌ Bekor qilish']]).resize()
        );
        return ctx.wizard.next();
    },

    // 2-QADAM: Ismni qabul qilish va telefon raqamini so'rash
    async (ctx) => {
        const text = ctx.message?.text;

        // Bekor qilish tekshiruvi
        if (text === '❌ Bekor qilish' || text === '/cancel') {
            await ctx.reply('Anketa to\'ldirish bekor qilindi.', getMainMenuKeyboard());
            return ctx.scene.leave();
        }

        if (!text || text.startsWith('/')) {
            await ctx.reply('Iltimos, ismingizni to\'g\'ri matn ko\'rinishida yozing:');
            return;
        }

        // Ismni saqlab olamiz
        ctx.wizard.state.name = text.trim();

        // Telefon raqamini so'raymiz
        await ctx.reply(
            'Telefon raqamingiz?\nPastdagi tugma orqali kontakt yuborishingiz yoki raqamingizni yozib qoldirishingiz mumkin (Masalan: +998901234567):',
            Markup.keyboard([
                [Markup.button.contactRequest('📱 Kontaktni yuborish')],
                ['❌ Bekor qilish']
            ]).resize()
        );
        return ctx.wizard.next();
    },

    // 3-QADAM: Telefon raqamini qabul qilish va til sertifikatini so'rash (IELTS yoki Duolingo)
    async (ctx) => {
        const message = ctx.message;
        const text = message?.text;

        // Bekor qilish tekshiruvi
        if (text === '❌ Bekor qilish' || text === '/cancel') {
            await ctx.reply('Anketa to\'ldirish bekor qilindi.', getMainMenuKeyboard());
            return ctx.scene.leave();
        }

        let phone = '';
        if (message?.contact?.phone_number) {
            phone = message.contact.phone_number;
        } else if (text) {
            phone = text.trim();
        } else {
            await ctx.reply('Iltimos, telefon raqamingizni yozing yoki pastdagi tugmani bosing:');
            return;
        }

        ctx.wizard.state.phone = phone;

        // Til sertifikatini so'raymiz
        await ctx.reply(
            'Til sertifikatingiz bormi? (IELTS yoki Duolingo)\n\nQuyidagi tugmalardan birini tanlang yoki sertifikat ballingiz bilan yozing (Masalan: IELTS 6.5 yoki Duolingo 110):',
            Markup.keyboard([
                ['IELTS', 'Duolingo'],
                ['Sertifikatim yo\'q', '❌ Bekor qilish']
            ]).resize()
        );
        return ctx.wizard.next();
    },

    // 4-QADAM: Sertifikat ma'lumotini qabul qilish, arizani saqlash va yakunlash
    async (ctx) => {
        const text = ctx.message?.text;

        // Bekor qilish tekshiruvi
        if (text === '❌ Bekor qilish' || text === '/cancel') {
            await ctx.reply('Anketa to\'ldirish bekor qilindi.', getMainMenuKeyboard());
            return ctx.scene.leave();
        }

        if (!text || text.startsWith('/')) {
            await ctx.reply('Iltimos, sertifikatingiz haqida ma\'lumotni matn ko\'rinishida yozing yoki quyidagi tugmalardan birini tanlang:');
            return;
        }

        const certificate = text.trim();

        // Foydalanuvchi ma'lumotlari
        const username = ctx.from.username
            ? `@${ctx.from.username}`
            : [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Noma\'lum';

        // Yangi arizani bazaga yozish
        const newOrder = db.createOrder({
            userId: ctx.from.id,
            username: username,
            name: ctx.wizard.state.name,
            phone: ctx.wizard.state.phone,
            certificate: certificate
        });

        // Foydalanuvchiga tasdiq javobi berish
        await ctx.reply(
            'Arizangiz ko\'rib chiqilmoqda yaqin soatlarda administratorimiz siz bilan bog\'lanadi !',
            getMainMenuKeyboard()
        );

        // Adminga bildirishnoma yuborish
        await sendOrderToAdmin(ctx.telegram, newOrder);

        // Sahifani (scene) yakunlash
        return ctx.scene.leave();
    }
);

// Agar foydalanuvchi anketada yurgan vaqtida /start yoki menyu tugmalarini bossa, sahnadan chiqarish
anketaWizard.command('start', async (ctx) => {
    await ctx.scene.leave();
    return showStart(ctx);
});

anketaWizard.hears('📞 Bog\'lanish', async (ctx) => {
    await ctx.scene.leave();
    return ctx.reply(CONTACT_INFO, getMainMenuKeyboard());
});

anketaWizard.hears('❓ Savollar', async (ctx) => {
    await ctx.scene.leave();
    return ctx.reply(FAQ_INFO, getMainMenuKeyboard());
});

// Scene larni ro'yxatdan o'tkazamiz
const stage = new Stage([anketaWizard]);

// Sessiya va bosqichlarni botga ulash
bot.use(session());
bot.use(stage.middleware());

// ===================================================================
// START VA ASOSIY MENYU BUYRUQLARI
// ===================================================================

/**
 * /start buyrug'i va salomlashish funksiyasi
 */
async function showStart(ctx) {
    // Foydalanuvchini bazada saqlash / hisobga olish
    db.saveUser(ctx.from);

    const userName = ctx.from.first_name || 'Foydalanuvchi';
    const welcomeText = `Assalomu alaykum, ${userName}!\nBizning rasmiy botimizga xush kelibsiz.\n\nKerakli bo'limni tanlash uchun quyidagi menyu tugmalaridan birini bosing:`;

    await ctx.reply(welcomeText, getMainMenuKeyboard());
}

bot.start(async (ctx) => {
    await showStart(ctx);
});

// ===================================================================
// MENYU TUGMALARI ISHLOVCHILARI
// ===================================================================

// 1-tugma: "Anketa to'ldirish"
bot.hears(['📝 Anketa to\'ldirish', 'Anketa to\'ldirish', 'anketa'], async (ctx) => {
    db.saveUser(ctx.from);
    await ctx.scene.enter('anketa-wizard');
});

// 2-tugma: "Bog'lanish"
bot.hears(['📞 Bog\'lanish', 'Bog\'lanish', 'boglanish', 'Boglanish'], async (ctx) => {
    db.saveUser(ctx.from);
    await ctx.reply(CONTACT_INFO, getMainMenuKeyboard());
});

// 3-tugma: "Savollar"
bot.hears(['❓ Savollar', 'Savollar', 'savollar'], async (ctx) => {
    db.saveUser(ctx.from);
    await ctx.reply(FAQ_INFO, getMainMenuKeyboard());
});

// ===================================================================
// ADMIN BUYRUQLARI VA ISHLOVCHILARI
// ===================================================================

/**
 * /admin buyrug'i - Bot statistikasi va ma'lumotlar
 */
bot.command('admin', async (ctx) => {
    const userId = String(ctx.from.id);

    // Faqat admin ruxsatiga egaligini tekshirish
    if (!ADMIN_CHAT_ID || userId !== String(ADMIN_CHAT_ID)) {
        return ctx.reply('❌ Kechirasiz, siz ushbu bot administratori emassiz.');
    }

    // Statistikani bazadan olish
    const stats = db.getStats();

    const adminStatsText = `📊 BOT STATISTIKASI (ADMIN PANELI):

👥 Botdan foydalanganlar soni: ${stats.totalUsers} ta
📦 Jami tushgan arizalar: ${stats.totalOrders} ta

Holatlar bo'yicha:
⏳ Ko'rib chiqilishi kutilayotgan: ${stats.pendingOrders} ta
✅ Qabul qilingan (Tasdiqlangan): ${stats.approvedOrders} ta
❌ Rad etilgan: ${stats.rejectedOrders} ta`;

    await ctx.reply(adminStatsText);
});

// ===================================================================
// ADMIN INLINE TUGMALARI: TASDIQLASH VA RAD ETISH
// ===================================================================

/**
 * "Tasdiqlash" tugmasi bosilganda
 */
bot.action(/^accept_(\d+)$/, async (ctx) => {
    const userId = String(ctx.from.id);

    // Admin ekanligini tekshirish
    if (ADMIN_CHAT_ID && userId !== String(ADMIN_CHAT_ID)) {
        return ctx.answerCbQuery('❌ Sizda bu amalni bajarish uchun ruxsat yo\'q!', { show_alert: true });
    }

    const orderId = ctx.match[1];
    const order = db.getOrder(orderId);

    if (!order) {
        return ctx.answerCbQuery('❌ Ariza bazadan topilmadi!', { show_alert: true });
    }

    // Ariza allaqachon ko'rib chiqilgan bo'lsa
    if (order.status !== 'pending') {
        const holatText = order.status === 'approved' ? 'tasdiqlangan' : 'rad etilgan';
        return ctx.answerCbQuery(`⚠️ Ushbu ariza allaqachon ${holatText}!`, { show_alert: true });
    }

    // Bazada holatini "approved" ga o'zgartiramiz
    db.updateOrderStatus(orderId, 'approved');

    // Foydalanuvchiga tasdiqlash xabarini yuboramiz
    let userNotified = true;
    try {
        await ctx.telegram.sendMessage(order.userId, APPROVAL_MESSAGE);
    } catch (error) {
        console.error(`Foydalanuvchiga (${order.userId}) xabar yuborib bo'lmadi:`, error.message);
        userNotified = false;
    }

    // Admin xabaridagi tugmalarni olib tashlaymiz va yangilangan holatni ko'rsatamiz
    const originalText = ctx.callbackQuery.message.text;
    const adminNotificationStatus = userNotified
        ? '✅ TASDIQLANDI (Foydalanuvchiga muvaffaqiyatli xabar yuborildi)'
        : '⚠️ TASDIQLANDI (Biroq foydalanuvchiga xabar yuborib bo\'lmadi, botni bloklagan bo\'lishi mumkin)';

    const updatedAdminText = `${originalText}\n\n📌 Holat: ${adminNotificationStatus}\n🕒 Ko'rib chiqilgan vaqt: ${formatDateTime()}`;

    try {
        await ctx.editMessageText(updatedAdminText, {
            reply_markup: { inline_keyboard: [] } // Tugmalarni yo'qotish
        });
    } catch (err) {
        console.error('Admin xabarini tahrirlashda xatolik:', err.message);
    }

    await ctx.answerCbQuery('Arizachi muvaffaqiyatli tasdiqlandi! ✅');
});

/**
 * "Rad etish" tugmasi bosilganda
 */
bot.action(/^reject_(\d+)$/, async (ctx) => {
    const userId = String(ctx.from.id);

    // Admin ekanligini tekshirish
    if (ADMIN_CHAT_ID && userId !== String(ADMIN_CHAT_ID)) {
        return ctx.answerCbQuery('❌ Sizda bu amalni bajarish uchun ruxsat yo\'q!', { show_alert: true });
    }

    const orderId = ctx.match[1];
    const order = db.getOrder(orderId);

    if (!order) {
        return ctx.answerCbQuery('❌ Ariza bazadan topilmadi!', { show_alert: true });
    }

    // Ariza allaqachon ko'rib chiqilgan bo'lsa
    if (order.status !== 'pending') {
        const holatText = order.status === 'approved' ? 'tasdiqlangan' : 'rad etilgan';
        return ctx.answerCbQuery(`⚠️ Ushbu ariza allaqachon ${holatText}!`, { show_alert: true });
    }

    // Bazada holatini "rejected" ga o'zgartiramiz
    db.updateOrderStatus(orderId, 'rejected');

    // Foydalanuvchiga rad etish xabarini yuboramiz
    let userNotified = true;
    try {
        await ctx.telegram.sendMessage(order.userId, REJECTION_MESSAGE);
    } catch (error) {
        console.error(`Foydalanuvchiga (${order.userId}) xabar yuborib bo'lmadi:`, error.message);
        userNotified = false;
    }

    // Admin xabaridagi tugmalarni olib tashlaymiz va yangilangan holatni ko'rsatamiz
    const originalText = ctx.callbackQuery.message.text;
    const adminNotificationStatus = userNotified
        ? '❌ RAD ETILDI (Foydalanuvchiga rad xabari yuborildi)'
        : '⚠️ RAD ETILDI (Biroq foydalanuvchiga xabar yuborib bo\'lmadi)';

    const updatedAdminText = `${originalText}\n\n📌 Holat: ${adminNotificationStatus}\n🕒 Ko'rib chiqilgan vaqt: ${formatDateTime()}`;

    try {
        await ctx.editMessageText(updatedAdminText, {
            reply_markup: { inline_keyboard: [] } // Tugmalarni yo'qotish
        });
    } catch (err) {
        console.error('Admin xabarini tahrirlashda xatolik:', err.message);
    }

    await ctx.answerCbQuery('Arizachiga rad etish xabari yuborildi! ❌');
});

// ===================================================================
// XATOLIKLARNI USHLASH VA BOTNI ISHGA TUSHIRISH
// ===================================================================

bot.catch((err, ctx) => {
    console.error(`Botda kutilmagan xatolik yuz berdi (${ctx.updateType}):`, err);
});

// Botni ishga tushirish (Long polling)
async function startBot() {
    try {
        const botInfo = await bot.telegram.getMe();
        bot.botInfo = botInfo;
        console.log('====================================================');
        console.log(`🚀 Telegram Sotuv Manager Boti (@${botInfo.username}) muvaffaqiyatli ishga tushdi!`);
        console.log(`👤 Admin Chat ID: ${ADMIN_CHAT_ID || 'Belgilanmagan'}`);
        console.log('====================================================');
        await bot.launch();
    } catch (err) {
        console.error('Botni ishga tushirishda xatolik yuz berdi:', err);
    }
}

startBot();

// Dastur to'xtatilganda botni xavfsiz to'xtatish (Graceful stop)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
