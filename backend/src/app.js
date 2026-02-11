const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const errorHandler = require('./middlewares/errorHandler');
const requestContext = require('./middlewares/requestContext');

const app = express();

// Middleware
const corsOrigins = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

morgan.token('request-id', (req) => req.requestId || '-');

app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));
app.use(requestContext);
app.use(morgan(':date[iso] :request-id :method :url :status :response-time ms'));
app.use(express.json({ limit: '1mb' }));

// Swagger Documentation
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Real Estate Management API',
            version: '1.0.0',
            description: 'API for managing properties, tenants, contracts, payments, and maintenance.',
        },
        servers: [
            {
                url: 'http://localhost:5000',
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

swaggerOptions.definition.components = {
    securitySchemes: {
        bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        },
    },
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Web Routes (admin, manager)
app.use('/api/web', require('./routes/web/index'));

// Mobile Routes (Tenant)
app.use('/api/mobile', require('./routes/mobile/index'));

// Cron Routes (Internal/Scheduled Tasks)
app.use('/api/cron', require('./routes/cronRoutes'));

// Legacy/Shared Routes (au cas où, mais idéalement à migrer)
// app.use('/api/properties', require('./routes/propertyRoutes'));
// app.use('/api/tenants', require('./routes/tenantRoutes'));
// app.use('/api/contracts', require('./routes/contractRoutes'));
// app.use('/api/payments', require('./routes/paymentRoutes'));
// app.use('/api/maintenance', require('./routes/maintenanceRoutes'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error Handler
app.use(errorHandler);

module.exports = app;

