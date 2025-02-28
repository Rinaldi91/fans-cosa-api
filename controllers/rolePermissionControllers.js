const Role = require('../models/rolePermissionModel');

const RolePermissionController = {
    // Menambahkan permission ke role
    assignPermissionsToRole: async (req, res) => {
        const { roleId, permissionIds } = req.body; // Expect permissionIds to be an array
    
        if (!roleId || !Array.isArray(permissionIds) || permissionIds.length === 0) {
            return res.status(400).send({
                status: 'error',
                message: 'Role ID and Permission IDs are required',
                data: null,
            });
        }
    
        try {
            const assignedPermissions = [];
    
            // Ambil nama role berdasarkan ID
            const role = await Role.getRoleById(roleId);
            if (!role) {
                return res.status(404).send({
                    status: 'error',
                    message: 'Role not found',
                    data: null,
                });
            }
    
            // Assign each permission and fetch its details
            for (const permissionId of permissionIds) {
                await Role.assignPermission(roleId, permissionId);
                const permission = await Role.getPermissionById(permissionId); // Ambil data permission berdasarkan ID
                assignedPermissions.push(permission);
            }
    
            res.status(200).send({
                status: 'success',
                message: 'Permissions assigned to role successfully',
                data: {
                    roleId: role.id,
                    roleName: role.name,
                    permissions: assignedPermissions,
                },
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to assign permissions to role',
                data: { error: error.message },
            });
        }
    },
    
    // Menghapus permission dari role
    removePermissionFromRole: async (req, res) => {
        const { roleId, permissionId } = req.body;

        if (!roleId || !permissionId) {
            return res.status(400).send({
                status: 'error',
                message: 'Role ID and Permission ID are required',
                data: null,
            });
        }

        try {
            const result = await Role.removePermission(roleId, permissionId);
            if (result.affectedRows === 0) {
                return res.status(404).send({
                    status: 'error',
                    message: 'Permission not found for role',
                    data: null,
                });
            }

            res.status(200).send({
                status: 'success',
                message: 'Permission removed from role successfully',
                data: null,
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to remove permission from role',
                data: { error: error.message },
            });
        }
    },

    updateAssignPermissionsToRole: async (req, res) => {
        const { roleId, permissionIds } = req.body; // permissionIds diharapkan sebagai array
        
        if (!roleId || !Array.isArray(permissionIds)) {
            return res.status(400).send({
                status: 'error',
                message: 'Role ID and Permission IDs are required',
                data: null,
            });
        }
    
        try {
            // Log untuk debugging
            console.log('Role ID:', roleId);
            console.log('Permission IDs:', permissionIds);
    
            // Ambil nama role berdasarkan ID
            const role = await Role.getRoleById(roleId);
            if (!role) {
                return res.status(404).send({
                    status: 'error',
                    message: 'Role not found',
                    data: null,
                });
            }
    
            console.log('Role:', role);
    
            // Ambil izin yang saat ini terkait dengan role
            const existingPermissions = await Role.getPermissionsByRoleId(roleId);
    
            // Debug daftar izin yang sudah ada
            console.log('Existing Permissions:', existingPermissions);
    
            // Cari izin untuk dihapus (ada di database tapi tidak ada di daftar baru)
            const permissionsToRemove = existingPermissions.filter(
                id => !permissionIds.includes(id.toString()) // Pastikan perbandingan string
            );
    
            // Cari izin untuk ditambahkan (ada di daftar baru tapi tidak ada di database)
            const permissionsToAdd = permissionIds.filter(
                id => !existingPermissions.includes(parseInt(id)) // Pastikan perbandingan integer
            );
    
            // Debug izin yang akan dihapus dan ditambahkan
            console.log('Permissions to Remove:', permissionsToRemove);
            console.log('Permissions to Add:', permissionsToAdd);
    
            // Hapus izin yang tidak dicentang
            for (const permissionId of permissionsToRemove) {
                await Role.removePermission(roleId, permissionId);
            }
    
            // Tambahkan izin yang baru dicentang
            for (const permissionId of permissionsToAdd) {
                await Role.assignPermission(roleId, permissionId);
            }
    
            // Ambil izin yang telah diperbarui
            const updatedPermissions = await Promise.all(
                permissionIds.map(id => Role.getPermissionById(id))
            );
    
            // Kirim respon sukses
            res.status(200).send({
                status: 'success',
                message: 'Permissions updated successfully',
                data: {
                    roleId: role.id,
                    roleName: role.name,
                    permissions: updatedPermissions,
                },
            });
        } catch (error) {
            console.error('Error during update:', error.message);
            res.status(500).send({
                status: 'error',
                message: 'Failed to update permissions for role',
                data: { error: error.message },
            });
        }
    },
    
};

module.exports = RolePermissionController;
