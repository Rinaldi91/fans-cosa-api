const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const logActivity = async (req, res, next) => {
    const logPath = path.join(__dirname, 'logs', 'activity.log');

    res.on('finish', async () => {
        let userId = null;
        let userName = null;

        // ✅ Cek apakah req.user tersedia dari middleware auth
        if (req.user && req.user.id) {
            userId = req.user.id;
            userName = req.user.name || null; // Ambil nama lengkap dari req.user jika tersedia
        } else if (req.user && req.user.i) {
            userId = req.user.i;
            userName = req.user.name || req.user.n || null; // Ambil nama lengkap dari req.user jika tersedia
        }

        // ✅ Cek apakah token tersedia di header Authorization atau cookie
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

        if ((!userId || !userName) && token) {
            try {
                const decoded = jwt.verify(token, process.env.SECRET_KEY);

                // Deteksi field i sebagai user ID
                if (decoded && decoded.i) {
                    userId = decoded.i;
                } else if (decoded && decoded.id) {
                    userId = decoded.id;
                } else if (decoded && decoded.userId) {
                    userId = decoded.userId;
                } else if (decoded && decoded.user_id) {
                    userId = decoded.user_id;
                }

                // Deteksi nama dari berbagai kemungkinan field
                if (decoded && decoded.name) {
                    userName = decoded.name; // Ambil nama lengkap dari token
                } else if (decoded && decoded.n) {
                    userName = decoded.n; // Ambil nama lengkap dari token
                } else if (decoded && decoded.username) {
                    userName = decoded.username; // Ambil nama lengkap dari token
                } else if (decoded && decoded.e) {
                    userName = decoded.e; // Gunakan email sebagai fallback jika nama tidak tersedia
                }

                console.log("✅ User info dari token:", { id: userId, name: userName });
            } catch (err) {
                console.error("❌ Error decoding token:", err);
            }
        }

        // Jika masih tidak ada userName, coba ambil dari database berdasarkan userId
        if (userId && !userName) {
            try {
                // Sesuaikan query ini dengan struktur tabel pengguna Anda
                const [user] = await db.query(
                    "SELECT name FROM users WHERE id = ?",
                    [userId]
                );

                if (user && user[0] && user[0].name) {
                    userName = user[0].name; // Pastikan nama lengkap diambil dari database
                    console.log("✅ User name diperoleh dari database:", userName);
                }
            } catch (err) {
                console.error("❌ Error getting user name from database:", err);
            }
        }

        console.log("🛠️ User terdeteksi:", { id: userId, name: userName });

        const requestData = req.method === 'GET'
            ? (Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : null)
            : (Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null);

        const logEntry = `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | User ID: ${userId || 'NULL'} | Name: ${userName || 'NULL'} | IP: ${req.ip} | Status: ${res.statusCode} | User-Agent: ${req.headers['user-agent']} | Data: ${requestData}\n`;

        if (!fs.existsSync(path.join(__dirname, 'logs'))) {
            fs.mkdirSync(path.join(__dirname, 'logs'));
        }

        fs.appendFile(logPath, logEntry, (err) => {
            if (err) console.error('❌ Error writing log file:', err);
        });

        console.log("🔍 Nilai name yang akan disimpan:", userName);

        try {
            await db.query(
                "INSERT INTO activity_logs (user_id, name, method, endpoint, request_body, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
                [userId || null, userName || null, req.method, req.originalUrl, requestData, req.ip]
            );
            console.log(`✅ Log aktivitas tersimpan di database: ${req.method} ${req.originalUrl}`);
        } catch (err) {
            console.error("❌ Error saving log to database:", err);
            console.error("Error detail:", err.message); // Tambahkan detail error
        }
    });

    next();
};

module.exports = logActivity;