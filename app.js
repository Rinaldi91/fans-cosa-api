require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const rolePermissionRoutes = require('./routes/rolePermissionRoutes');
const patientRoutes = require('./routes/patientRoutes');
const testGlucosaRoutes = require('./routes/testGlucosaRoutes');
const connectionStatusRoutes = require('./routes/connectionStatusRoutes');
const settingRoutes = require('./routes/settingRoutes');
const staticTokenRoutes = require('./routes/staticTokenRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

// Import routes Bridgings
const testGlucosaBridgingRoutes = require('./routes/testGlucosaBridgingRoutes');
const mappingPatientRoutes = require('./routes/mappingPatientRoutes');

const logActivity = require('./models/Logs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://192.168.18.29:3000',
    'http://localhost:3000',
    'https://*.ngrok.io',
    'https://ad11-66-96-225-166.ngrok-free.app'

];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};


app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Tangani preflight request OPTIONS

// Middleware Keamanan
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(logActivity);

// Rate Limiting
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 100,
//     message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Test database connection
(async () => {
    try {
        const [rows] = await db.query('SELECT 1');
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
app.use('/api/role-permissions', rolePermissionRoutes);
app.use('/api/permission', permissionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/test-glucosa', testGlucosaRoutes);
app.use('/api/connection-status', connectionStatusRoutes);
app.use('/api/setting', settingRoutes);
app.use('/api/static-token', staticTokenRoutes);
app.use('/api/activity-log', activityLogRoutes);

//Routes Bridgings
app.use('/api/v1/bridging/glucose-test', testGlucosaBridgingRoutes);
app.use('/api/v1/bridging/mapping-patient', mappingPatientRoutes);


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
