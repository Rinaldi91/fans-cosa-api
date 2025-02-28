const db = require('../config/db');

const Permission = {
    // Mendapatkan semua permissions
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM permissions');
        return rows;
    },

    // Mendapatkan permission berdasarkan ID
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM permissions WHERE id = ?', [id]);
        return rows[0];
    },

    // Menambahkan permission baru
    create: async (name, description) => {
        const [result] = await db.query('INSERT INTO permissions (name, description) VALUES (?, ?)', [name, description]);
        return { id: result.insertId, name, description };
    },


    // Memperbarui permission berdasarkan ID
    update: async (id, name, description) => {
        const [result] = await db.query('UPDATE permissions SET name = ?, description = ? WHERE id = ?', [name, description, id]);
        if (result.affectedRows > 0) {
            return { id, name, description };
        }
        return null;  // Jika tidak ada baris yang terpengaruh (misalnya ID tidak ditemukan)
    },

    // Menghapus permission berdasarkan ID
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM permissions WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
};

module.exports = Permission;
