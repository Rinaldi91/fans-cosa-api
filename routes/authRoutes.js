const express = require('express');
const AuthController = require('../controllers/authController');
const router = express.Router();

// Register user
router.post('/register', AuthController.register);

// Login user
router.post('/login', AuthController.login);

//verify token
router.get('/verify-token', AuthController.verifyToken);

// Route logout
router.post('/logout', AuthController.logout);

module.exports = router;
