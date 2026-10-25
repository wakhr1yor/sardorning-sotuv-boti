/**
 * database.js - Oddiy va ishonchli JSON fayl asosidagi ma'lumotlar bazasi
 * Bot foydalanuvchilari va kelib tushgan arizalarni saqlash uchun xizmat qiladi.
 */

const fs = require('fs');
const path = require('path');

// Ma'lumotlar saqlanadigan fayl manzili
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Bazaning boshlang'ich strukturasi
const DEFAULT_DATA = {
    users: {},       // Foydalanuvchilar ro'yxati: { [userId]: { id, username, firstName, joinedAt } }
    orders: [],      // Arizalar ro'yxati
    lastOrderId: 0   // Oxirgi ariza tartib raqami
};

/**
 * Baza faylini tekshirish va mavjud bo'lmasa yaratish
 */
function initDb() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
    }
}

/**
 * Bazadan barcha ma'lumotlarni o'qish
 * @returns {typeof DEFAULT_DATA}
 */
function readDb() {
    initDb();
    try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Bazani o\'qishda xatolik:', error);
        return DEFAULT_DATA;
    }
}

/**
 * Ma'lumotlarni bazaga yozish (saqlash)
 * @param {typeof DEFAULT_DATA} data
 */
function writeDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Bazaga yozishda xatolik:', error);
    }
}

/**
 * Yangi foydalanuvchini bazaga qo'shish yoki yangilash
 * @param {object} user - Telegram user obyekti (ctx.from)
 * @returns {boolean} - Agar yangi foydalanuvchi bo'lsa true
 */
function saveUser(user) {
    if (!user || !user.id) return false;
    const db = readDb();
    const userId = String(user.id);
    const isNew = !db.users[userId];

    db.users[userId] = {
        id: user.id,
        username: user.username ? `@${user.username}` : 'Mavjud emas',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        joinedAt: db.users[userId]?.joinedAt || new Date().toISOString(),
        lastActive: new Date().toISOString()
    };

    writeDb(db);
    return isNew;
}

/**
 * Jami botdan foydalanganlar sonini olish
 * @returns {number}
 */
function getUserCount() {
    const db = readDb();
    return Object.keys(db.users || {}).length;
}

/**
 * Yangi ariza (buyurtma) qo'shish
 * @param {object} orderData - Ariza ma'lumotlari
 * @returns {object} - Yaratilgan ariza
 */
function createOrder(orderData) {
    const db = readDb();
    db.lastOrderId = (db.lastOrderId || 0) + 1;

    const newOrder = {
        id: db.lastOrderId,
        userId: orderData.userId,
        username: orderData.username || 'Mavjud emas',
        name: orderData.name,
        phone: orderData.phone,
        certificate: orderData.certificate || 'Ko\'rsatilmagan',
        service: orderData.service || 'Ko\'rsatilmagan',
        comment: orderData.comment || 'Izoh qoldirilmagan',
        status: 'pending', // pending | approved | rejected
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    writeDb(db);
    return newOrder;
}

/**
 * ID bo'yicha arizani topish
 * @param {number|string} orderId 
 * @returns {object|null}
 */
function getOrder(orderId) {
    const db = readDb();
    return db.orders.find(o => String(o.id) === String(orderId)) || null;
}

/**
 * Ariza holatini yangilash (tasdiqlash yoki rad etish)
 * @param {number|string} orderId 
 * @param {'approved'|'rejected'} status 
 * @returns {object|null}
 */
function updateOrderStatus(orderId, status) {
    const db = readDb();
    const order = db.orders.find(o => String(o.id) === String(orderId));
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    writeDb(db);
    return order;
}

/**
 * Admin uchun umumiy statistikani olish
 * @returns {object}
 */
function getStats() {
    const db = readDb();
    const totalUsers = Object.keys(db.users || {}).length;
    const totalOrders = db.orders.length;
    const approvedOrders = db.orders.filter(o => o.status === 'approved').length;
    const rejectedOrders = db.orders.filter(o => o.status === 'rejected').length;
    const pendingOrders = db.orders.filter(o => o.status === 'pending').length;

    return {
        totalUsers,
        totalOrders,
        approvedOrders,
        rejectedOrders,
        pendingOrders
    };
}

module.exports = {
    initDb,
    saveUser,
    getUserCount,
    createOrder,
    getOrder,
    updateOrderStatus,
    getStats
};
