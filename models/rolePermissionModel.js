const db = require('../config/db');

const RolePermission = {
    
    getPermissionById: async (permissionId) => {
        const [rows] = await db.query('SELECT id, name FROM permissions WHERE id = ?', [permissionId]);
        return rows[0];
    },

    // Menambahkan izin (permission) ke role
    assignPermission: async (roleId, permissionId) => {
        return db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permissionId]);
    },

    // Menghapus izin (permission) dari role
    removePermission: async (roleId, permissionId) => {
        return db.query('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?', [roleId, permissionId]);
    },

    // Mendapatkan semua permission yang dimiliki oleh role tertentu
    getPermissionsByRoleId: async (roleId) => {
        const [rows] = await db.query(
            `SELECT permission_id 
             FROM role_permissions 
             WHERE role_id = ?`,
            [roleId]
        );
        return rows.map(row => row.permission_id); // Mengembalikan array ID permission
    },

    getRoleById: async (id) => {
        const [rows] = await db.query('SELECT id, name FROM roles WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null; // Pastikan hanya mengembalikan data jika ada hasil
    },
};

module.exports = RolePermission;
