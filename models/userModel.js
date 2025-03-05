const db = require('../config/db');

const User = {
    // Membuat user baru
    create: async (name, email, password) => {
        // Menyimpan user ke database
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
            [name, email, password]
        );
    
        // Mengambil data user yang baru dibuat berdasarkan ID yang dihasilkan
        const [rows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    

    // Mencari user berdasarkan email
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    // Mendapatkan semua pengguna
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM users');
        return rows;
    },

    // Mendapatkan user berdasarkan ID
    findById: async (id) => {
        const [rows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
        return rows[0];
    },
    getPermissionsByUserId: async (userId) => {
        const query = `
            SELECT p.id AS permission_id, p.name AS permission_name, p.description AS permission_description
            FROM permissions p
            INNER JOIN role_permissions rp ON rp.permission_id = p.id
            INNER JOIN roles r ON r.id = rp.role_id
            INNER JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = ?
        `;
        const [rows] = await db.query(query, [userId]);
        return rows;
    },

    getRolePermissionsByUserId: async (userId) => {
        const query = `
            SELECT 
                r.id AS role_id, 
                r.name AS role_name, 
                r.description AS role_description,
                p.id AS permission_id, 
                p.name AS permission_name, 
                p.description AS permission_description
            FROM permissions p
            INNER JOIN role_permissions rp ON rp.permission_id = p.id
            INNER JOIN roles r ON r.id = rp.role_id
            INNER JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = ?
        `;
        const [rows] = await db.query(query, [userId]);
        return rows;
    },

    // Menambahkan role ke user
    assignRole: async (userId, roleId) => {
        return db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
    },

    updateAssignRole: async (userId, roleId) => {
        const [result] = await db.query(
            'UPDATE user_roles SET role_id = ? WHERE user_id = ?',
            [roleId, userId]
        );
        return result.affectedRows > 0; // Return true jika berhasil diperbarui
    },
    
};

module.exports = User;
