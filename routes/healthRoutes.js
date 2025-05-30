const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Health check endpoint
router.get('/', async (req, res) => {
    try {
        // Check database connection
        const [rows] = await db.query('SELECT 1 as health');
        
        const healthStatus = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            database: {
                status: 'connected',
                host: process.env.DB_HOST || 'localhost'
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
            }
        };

        res.status(200).json(healthStatus);
    } catch (error) {
        console.error('Health check failed:', error);
        
        const healthStatus = {
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            error: error.message,
            database: {
                status: 'disconnected',
                host: process.env.DB_HOST || 'localhost'
            }
        };

        res.status(503).json(healthStatus);
    }
});

module.exports = router;