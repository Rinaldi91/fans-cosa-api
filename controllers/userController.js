const User = require('../models/userModel');
const db = require('../config/db');

const UserController = {
    // Menambahkan role ke user
    assignRole: async (req, res) => {
        const { userId, roleId } = req.body;

        // Validasi input
        if (!userId || !roleId) {
            return res.status(400).send({
                status: 'error',
                message: 'User ID and Role ID are required',
                data: null,
            });
        }

        try {
            await User.assignRole(userId, roleId);
            res.status(200).send({
                status: 'success',
                message: 'Role assigned to user successfully',
                data: { userId, roleId },
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to assign role',
                data: { error: error.message },
            });
        }
    },

    // Memperbarui role yang sudah di-assign
    updateAssignRole: async (req, res) => {
        const { userId, roleId } = req.body;

        // Validasi input
        if (!userId || !roleId) {
            return res.status(400).send({
                status: 'error',
                message: 'User ID and Role ID are required',
                data: null,
            });
        }

        try {
            // Periksa apakah roleId ada di tabel roles
            const [roleExists] = await db.query('SELECT id FROM roles WHERE id = ?', [roleId]);
            if (roleExists.length === 0) {
                return res.status(404).send({
                    status: 'error',
                    message: 'Role ID not found',
                    data: null,
                });
            }

            // Lanjutkan pembaruan jika roleId valid
            const updated = await User.updateAssignRole(userId, roleId);

            if (!updated) {
                return res.status(404).send({
                    status: 'error',
                    message: 'User or role assignment not found',
                    data: null,
                });
            }

            res.status(200).send({
                status: 'success',
                message: 'Role updated successfully',
                data: { userId, roleId },
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to update role',
                data: { error: error.message },
            });
        }
    },

    // Mendapatkan daftar semua pengguna
    getAllUsers: async (req, res) => {
        try {
            const users = await User.getAll();
            res.status(200).send({
                status: 'success',
                message: 'Users retrieved successfully',
                data: users,
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to retrieve users',
                data: { error: error.message },
            });
        }
    },

    // Mendapatkan detail user berdasarkan ID
    getUserById: async (req, res) => {
        const { id } = req.params;

        // Validasi input
        if (!id) {
            return res.status(400).send({
                status: 'error',
                message: 'User ID is required',
                data: null,
            });
        }

        try {
            // Ambil detail pengguna berdasarkan ID
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).send({
                    status: 'error',
                    message: 'User not found',
                    data: null,
                });
            }

            // Ambil role permissions berdasarkan user ID
            const rolePermissions = await User.getRolePermissionsByUserId(id);

            // Proses dan strukturkan data roles dan permissions
            const processedData = {
                user,
                roles: [],
                permissions: [],
            };

            // Cek apakah rolePermissions adalah array
            if (Array.isArray(rolePermissions) && rolePermissions.length > 0) {
                // Ekstrak roles unik
                const uniqueRoles = rolePermissions.reduce((acc, item) => {
                    if (item.role_id && !acc.some(role => role.id === item.role_id)) {
                        acc.push({
                            id: item.role_id,
                            name: item.role_name,
                            description: item.role_description
                        });
                    }
                    return acc;
                }, []);

                // Ekstrak permissions unik
                const uniquePermissions = rolePermissions.reduce((acc, item) => {
                    if (item.permission_id && !acc.some(perm => perm.id === item.permission_id)) {
                        acc.push({
                            id: item.permission_id,
                            name: item.permission_name,
                            description: item.permission_description
                        });
                    }
                    return acc;
                }, []);

                processedData.roles = uniqueRoles;
                processedData.permissions = uniquePermissions;
            }

            res.status(200).send({
                status: 'success',
                message: 'User details retrieved successfully',
                data: processedData,
            });
        } catch (error) {
            console.error('Error retrieving user details:', error);
            res.status(500).send({
                status: 'error',
                message: 'Failed to retrieve user details',
                data: {
                    error: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                },
            });
        }
    },
    
};

module.exports = UserController;
