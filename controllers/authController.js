const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/userModel'); // Pastikan model User sudah didefinisikan
const { SECRET_KEY } = require('../config/auth'); // Gunakan environment variable untuk secret key
const db = require('../config/db');

// Helper Functions
const validateInput = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send({
            status: 'error',
            message: errors.array()[0].msg,
            data: null,
        });
    }
};

const hashPassword = (password) => {
    return bcrypt.hashSync(password, 10); // Hash password dengan salt rounds 10
};

const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword); // Verifikasi password
};

const getRoleId = async (userId) => {
    const [rows] = await db.query('SELECT role_id FROM user_roles WHERE user_id = ?', [userId]);
    if (rows.length === 0) throw new Error('User role not found');
    return rows[0].role_id;
};

const generateToken = (user, roleId) => {
    return jwt.sign(
        {
            i: user.id,
            name: user.name,
            e: user.email.slice(0, 2),
            roleId: roleId,
        },
        SECRET_KEY,
        { expiresIn: '1h', algorithm: 'HS256' }
    );
};

// AuthController
const AuthController = {
    register: [
        // Validasi input menggunakan express-validator
        body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
        body('email').isEmail().withMessage('Invalid email format'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

        async (req, res) => {
            try {
                // Validasi input
                validateInput(req, res);

                const { name, email, password } = req.body;

                // Hash password
                const hashedPassword = hashPassword(password);

                // Create user
                const user = await User.create(name, email, hashedPassword);

                // Tambahkan role_id: 3 ke tabel user_roles
                const roleId = 3; // role_id untuk user default
                await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [user.id, roleId]);

                res.status(201).send({
                    status: 'success',
                    message: 'User registered successfully',
                    data: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role_id: roleId,
                    },
                });
            } catch (error) {
                console.error('Registration failed:', error.message);
                res.status(500).send({
                    status: 'error',
                    message: error.message,
                    data: null,
                });
            }
        },
    ],

    login: [
        // Validasi input menggunakan express-validator
        body('email').isEmail().withMessage('Invalid email format'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),

        async (req, res) => {
            try {
                // Validasi input
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Validation failed',
                        errors: errors.array()
                    });
                }

                const { email, password } = req.body;

                // Cari user berdasarkan email
                const user = await User.findByEmail(email);
                if (!user) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'User not found',
                        data: null,
                    });
                }

                // Verifikasi password
                const isValid = await verifyPassword(password, user.password);
                if (!isValid) {
                    return res.status(401).json({
                        status: 'error',
                        message: 'Invalid credentials',
                        data: null,
                    });
                }

                // Dapatkan roleId berdasarkan user.id
                const roleId = await getRoleId(user.id);

                // Generate token
                const token = generateToken(user, roleId);

                // Kirim token dalam HTTP-only cookie
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production', // Aktifkan HTTPS di production
                    sameSite: 'lax',
                    expires: new Date(Date.now() + 3600 * 1000), // 1 jam
                });

                // Kirim response
                const responseData = {
                    status: 'success',
                    message: 'Login successful',
                    data: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        ...(process.env.NODE_ENV === 'development' && { token: token })
                    },
                };

                res.status(200).json(responseData);

            } catch (error) {
                console.error('Login failed:', error.message);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to log in',
                    data: { error: error.message },
                });
            }
        },
    ],

    verifyToken: async (req, res) => {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).send({
                status: 'error',
                message: 'Token missing',
                data: null,
            });
        }

        try {
            // Verifikasi token
            const decoded = jwt.verify(token, SECRET_KEY);

            // Ambil informasi user dari database berdasarkan id
            const [rows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [decoded.i]);

            // Jika user tidak ditemukan
            if (rows.length === 0) {
                return res.status(404).send({
                    status: 'error',
                    message: 'User not found',
                    data: null,
                });
            }

            // Ambil data user
            const user = rows[0];

            // Kirim response dengan data lengkap
            res.status(200).send({
                status: 'success',
                message: 'Token is valid',
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    roleId: decoded.roleId, // Ambil roleId dari token
                },
            });
        } catch (error) {
            res.status(403).send({
                status: 'error',
                message: 'Invalid token',
                data: null,
            });
        }
    },

    logout: (req, res) => {
        try {
            // Hapus cookie token
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Aktifkan HTTPS di production
                sameSite: 'lax',
            });

            // Kirim respons sukses
            res.status(200).send({
                status: 'success',
                message: 'Logout successful',
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to logout',
                data: { error: error.message },
            });
        }
    },

    // Endpoint Debugging untuk Pengujian (Hanya di Mode Development)
    debugToken: (req, res) => {
        if (process.env.NODE_ENV !== 'development') {
            return res.status(403).send({
                status: 'error',
                message: 'Debug endpoint is only available in development mode',
                data: null,
            });
        }

        const token = req.cookies.token; // Ambil token dari cookie
        if (!token) {
            return res.status(401).send({
                status: 'error',
                message: 'No token found',
                data: null,
            });
        }

        res.status(200).send({
            status: 'success',
            message: 'Debug token retrieved',
            data: { token },
        });
    },
};

module.exports = AuthController;