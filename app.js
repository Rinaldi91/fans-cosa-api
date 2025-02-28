require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet'); // Tambahkan helmet untuk keamanan tambahan
const rateLimit = require('express-rate-limit'); // Batasi jumlah request untuk mencegah DDoS

// Import routes
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const rolePermissionRoutes = require('./routes/rolePermissionRoutes');
const patientRoutes = require('./routes/patientRoutes');
const testGlucosaRoutes = require('./routes/testGlucosaRoutes');
const db = require('./config/db');

const app = express(); // Inisialisasi aplikasi Express
const PORT = process.env.PORT || 3000;

// Middleware Keamanan
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

// Penggunaan HTTP
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
db.getConnection((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to the database');
    }
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/roles-permission', rolePermissionRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/test-glucosa', testGlucosaRoutes);

app.use('/', (req, res) => {
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
    console.log(`Server is running on http://localhost:${PORT}`);
});

// app.listen(5000, '0.0.0.0', () => {
//     console.log('Server running on http://0.0.0.0:5000');
// });


// Penggunaan HTTPS
// const corsOptions = {
//     origin: function (origin, callback) {
//         if (!origin || allowedOrigins.some(allowedOrigin => {
//             // Handle wildcard domains
//             if (allowedOrigin.includes('*')) {
//                 const pattern = new RegExp('^' + allowedOrigin.replace('*', '.*'));
//                 return pattern.test(origin);
//             }
//             return allowedOrigin === origin;
//         })) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true,
// };