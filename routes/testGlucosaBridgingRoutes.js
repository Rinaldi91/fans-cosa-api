const express = require('express');
const testGlucosaBridgingController = require('../controllers/testGlucosaBridgingControllers');

const { authenticateToken } = require('../config/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

//all glucose tests
router.get('/', authorize('view_bridging_glucose_test'), testGlucosaBridgingController.getAllTestBridgingPatients);

module.exports = router;