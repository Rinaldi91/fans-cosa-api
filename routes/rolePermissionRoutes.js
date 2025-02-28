const express = require('express');
const RolePermissionController = require('../controllers/rolePermissionControllers');
const { authenticateToken } = require('../config/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// Gunakan middleware autentikasi sebelum RBAC
router.use(authenticateToken);


// Menambahkan permission ke role
router.post('/assign-permission', authorize('assign_permission'), RolePermissionController.assignPermissionsToRole);

// Menghapus permission dari role
router.delete('/remove-permission', authorize('assign_permission'), RolePermissionController.removePermissionFromRole);

// Route untuk memperbarui permission untuk role berdasarkan roleId
router.put('/update-permission', authorize('assign_permission'), RolePermissionController.updateAssignPermissionsToRole);


module.exports = router;
