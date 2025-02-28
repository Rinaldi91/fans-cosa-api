const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

// Middleware untuk memvalidasi token JWT
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).send({
            status: 'error',
            message: 'Access denied, token missing',
            data: null,
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Simpan payload JWT ke req.user
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
