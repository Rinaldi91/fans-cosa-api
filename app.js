require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet'); // Tambahkan helmet untuk keamanan tambahan
const rateLimit = require('express-rate-limit'); // Batasi jumlah request untuk mencegah DDoS
const db = require('./config/db'); // Koneksi MySQL2

// Import routes
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const rolePermissionRoutes = require('./routes/rolePermissionRoutes');
const patientRoutes = require('./routes/patientRoutes');
const testGlucosaRoutes = require('./routes/testGlucosaRoutes');
// const { authenticateToken } = require('./config/auth');
const logActivity = require('./models/Log');

const app = express(); // Inisialisasi aplikasi Express
const PORT = process.env.PORT || 3000;

// Middleware Keamanan
app.use(express.json());
// app.use(authenticateToken);
app.use(logActivity);
app.use(helmet()); // Mengamankan header HTTP

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // Batasi 100 request per IP
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Middleware Parsing dan Cookie
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Middleware CORS
const allowedOrigins = [
    process.env.FRONTEND_URL, 
    'http://192.168.18.29:5000',
    'http://localhost:5000', 
    'https://*.ngrok.io', // Menambahkan domain ngrok
    'https://*.ngrok-free.app' // Format baru domain ngrok
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Izinkan cookie
};

app.use(cors(corsOptions));

// Test database connection
(async () => {
    try {
        const [rows] = await db.query('SELECT 1'); // Pastikan tidak pakai db.promise().query
        console.log('✅ Connection to database successful');
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
})();

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/roles-permission', rolePermissionRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/test-glucosa', testGlucosaRoutes);

// Handling 404
app.use((req, res) => {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - Not Found</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
            }
            h1 {
                color: #333;
                margin-bottom: 20px;
            }
            p {
                color: #666;
            }
        </style>
      </head>
      <body>
        <h1>404 - Not Found</h1>
        <p>The page you are looking for does not exist.</p>
      </body>
      </html>
    `);
});

// Global Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({
        message: 'Internal Server Error',
        error: err.message,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
