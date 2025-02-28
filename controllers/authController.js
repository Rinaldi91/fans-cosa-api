const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { SECRET_KEY } = require('../config/auth');
const db = require('../config/db');

const AuthController = {
    register: async (req, res) => {
        const { name, email, password } = req.body;

        // Validasi name
        if (!name || name.trim().length < 3) {
            return res.status(400).send({
                status: 'error',
                message: 'Name must be at least 3 characters long',
                data: null,
            });
        }

        // Validasi email
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).send({
                status: 'error',
                message: 'Invalid email format',
                data: null,
            });
        }

        // Validasi password
        if (!password || password.length < 6) {
            return res.status(400).send({
                status: 'error',
                message: 'Password must be at least 6 characters long',
                data: null,
            });
        }

        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

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
            res.status(500).send({
                status: 'error',
                message: error.message,
                data: null,
            });
        }
    },

    // login: async (req, res) => {
    //     const { email, password } = req.body;

    //     // Validasi email dan password
    //     if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    //         return res.status(400).send({
    //             status: 'error',
    //             message: 'Invalid email format',
    //             data: null,
    //         });
    //     }

    //     if (!password || password.length < 6) {
    //         return res.status(400).send({
    //             status: 'error',
    //             message: 'Password must be at least 6 characters long',
    //             data: null,
    //         });
    //     }

    //     try {
    //         // Cari user berdasarkan email
    //         const user = await User.findByEmail(email);
    //         if (!user) {
    //             return res.status(404).send({
    //                 status: 'error',
    //                 message: 'User not found',
    //                 data: null,
    //             });
    //         }

    //         // Verifikasi password
    //         const isValid = await bcrypt.compare(password, user.password);
    //         if (!isValid) {
    //             return res.status(401).send({
    //                 status: 'error',
    //                 message: 'Invalid credentials',
    //                 data: null,
    //             });
    //         }

    //         // Query ke user_roles untuk mendapatkan roleId berdasarkan user.id
    //         // const [userRole] = await db.query('SELECT role_id FROM user_roles WHERE user_id = ?', [user.id]);
    //         const [rows] = await db.query('SELECT role_id FROM user_roles WHERE user_id = ?', [user.id]);
    //         if (rows.length === 0) {
    //             return res.status(404).send({
    //                 status: 'error',
    //                 message: 'User role not found',
    //                 data: null,
    //             });
    //         }

    //         // Ambil role_id dari hasil query
    //         const roleId = rows[0].role_id; // Akses elemen pertama
    //         // console.log('Role ID:', roleId);

    //         // Generate token dengan roleId
    //         const shortToken = jwt.sign({
    //             i: user.id,  // singkatan id
    //             e: user.email.slice(0, 2),  // 3 karakter pertama email
    //             roleId: roleId, // Tambahkan roleId ke dalam payload
    //         }, SECRET_KEY, {
    //             expiresIn: '1h',
    //             algorithm: 'HS256',
    //             noTimestamp: true  // Hilangkan timestamp bawaan
    //         });

    //         res.status(200).send({
    //             status: 'success',
    //             message: 'Login successful',
    //             data: {
    //                 id: user.id,
    //                 email: user.email,
    //                 token: shortToken,  // Kirimkan token sebagai bagian dari response
    //             },
    //         });
    //     } catch (error) {
    //         res.status(500).send({
    //             status: 'error',
    //             message: 'Failed to log in',
    //             data: { error: error.message },
    //         });
    //     }
    // },

    login: async (req, res) => {
        const { email, password } = req.body;

        // Validasi email dan password
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).send({
                status: 'error',
                message: 'Invalid email format',
                data: null,
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).send({
                status: 'error',
                message: 'Password must be at least 6 characters long',
                data: null,
            });
        }

        try {
            // Cari user berdasarkan email
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(404).send({
                    status: 'error',
                    message: 'User not found',
                    data: null,
                });
            }

            // Verifikasi password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).send({
                    status: 'error',
                    message: 'Invalid credentials',
                    data: null,
                });
            }

            // Dapatkan roleId berdasarkan user.id
            const [rows] = await db.query('SELECT role_id FROM user_roles WHERE user_id = ?', [user.id]);
            if (rows.length === 0) {
                return res.status(404).send({
                    status: 'error',
                    message: 'User role not found',
                    data: null,
                });
            }

            const roleId = rows[0].role_id;

            // Generate token
            const shortToken = jwt.sign({
                i: user.id,
                e: user.email.slice(0, 2),
                roleId: roleId,
            }, SECRET_KEY, {
                expiresIn: '1h',
                algorithm: 'HS256',
            });

            // Kirim token dalam HTTP-only cookie
            res.cookie('token', shortToken, {
                httpOnly: true, // Tidak dapat diakses oleh JavaScript
                secure: false, // Ubah ke true jika menggunakan HTTPS
                sameSite: 'lax', // Izinkan lintas domain yang aman
            });

            // Kirim respons tanpa token di body
            res.status(200).send({
                status: 'success',
                message: 'Login successful',
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    token: shortToken,
                },
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to log in',
                data: { error: error.message },
            });
        }
    },

    // Fungsi Verify Token yang baru
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
                secure: false, // Ubah ke true jika menggunakan HTTPS
                sameSite: 'lax', // Sesuaikan dengan kebutuhan
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

};

module.exports = AuthController;
