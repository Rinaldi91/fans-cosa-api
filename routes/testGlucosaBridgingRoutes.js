const express = require('express');
const testGlucosaBridgingController = require('../controllers/testGlucosaBridgingControllers');

const { authenticateToken } = require('../config/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

//Glucose Test All
router.get('/', authorize('view_bridging_glucose_test'), testGlucosaBridgingController.getAllTestBridgingPatients);

//Glucose Test By ID
router.get('/:id', authorize('view_bridging_glucose_test'), testGlucosaBridgingController.getTestBridgingPatientById);

module.exports = router;