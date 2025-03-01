// const mysql = require('mysql2');

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'rbac_db',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// module.exports = pool.promise();


// db.js

// Buat koneksi baru untuk setiap request (penting untuk serverless)
const mysql = require('mysql2/promise');

async function connectDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST, // Host InfinityFree Anda
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false, // InfinityFree biasanya tidak mendukung SSL
      connectTimeout: 10000 // Tambahkan timeout yang lebih lama
    });
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}