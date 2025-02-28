const express = require('express');
const testGlucosaController = require('../controllers/testGlucosaControllers');

const { authenticateToken } = require('../config/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// Gunakan middleware autentikasi sebelum RBAC
router.use(authenticateToken);

// Tambah tes gula darah baru
router.post('/', authorize('create_test_glucosa'), testGlucosaController.createTest);

//all glucose tests
router.get('/', authorize('view_test_glucosa'), testGlucosaController.getAllTestPatients);

// Dapatkan tes gula darah berdasarkan ID pasien
router.get('/patient/:patient_id', authorize('view_test_glucosa'), testGlucosaController.getPatientTests);
router.get('/patient/:patient_id/glucose-tests', authorize('view_test_glucosa'), testGlucosaController.getPatientTestsAll);

// Update tes gula darah
router.put('/:id', authorize('update_test_glucosa'), testGlucosaController.updateTest);

// Hapus tes gula darah
router.delete('/:id', authorize('delete_test_glucosa'), testGlucosaController.deleteTest);

//Syncronize glucose tests
router.post('/sync-glucosa-tests', authorize('update_test_glucosa'), testGlucosaController.syncGlucosaTests);

module.exports = router;