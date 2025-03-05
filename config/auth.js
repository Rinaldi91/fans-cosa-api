const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;

// Middleware untuk memvalidasi token JWT
const authenticateToken = (req, res, next) => {
    // Coba ambil token dari Header Authorization
    let token = req.headers.authorization?.split(' ')[1];

    // Jika tidak ada di header, coba dari cookie
    if (!token && req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).send({
            status: 'error',
            message: 'Access denied, token missing',
            data: null,
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);

        // Pastikan payload token berisi informasi penting
        if (!decoded.i || !decoded.name || !decoded.e || !decoded.roleId) {
            return res.status(400).send({
                status: 'error',
                message: 'Invalid token payload',
                data: null,
            });
        }

        // Simpan payload JWT ke req.user
        req.user = {
            id: decoded.i,       // ID pengguna
            name: decoded.name,  // Nama lengkap
            email: decoded.e,    // Email
            roleId: decoded.roleId, // Role ID
        };

        next();
    } catch (error) {
        return res.status(403).send({
            status: 'error',
            message: 'Invalid token',
            data: null,
        });
    }
};

module.exports = { authenticateToken, SECRET_KEY };