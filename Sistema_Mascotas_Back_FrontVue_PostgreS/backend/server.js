const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const userRoutes = require('./routes/userRoutes');
const clientRoutes = require('./routes/clientRoutes');
const petRoutes = require('./routes/petRoutes');
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const groomingRoutes = require('./routes/groomingRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Importar middleware de auditoría
const auditMiddleware = require('./middleware/auditMiddleware');

const app = express();

// Middleware básicos
app.use(helmet());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// RUTAS DE LA API
// ============================================

// Autenticación
app.use('/api/auth', authRoutes);

// Sucursales
app.use('/api/branches', branchRoutes);

// Usuarios
app.use('/api/users', userRoutes);

// Clientes
app.use('/api/clients', clientRoutes);

// Mascotas
app.use('/api/pets', petRoutes);

// Productos
app.use('/api/products', productRoutes);

// Servicios
app.use('/api/services', serviceRoutes);

// Citas
app.use('/api/appointments', appointmentRoutes);

// Ventas / Órdenes
app.use('/api/orders', orderRoutes);

// Grooming
app.use('/api/grooming', groomingRoutes);

// Auditoría (solo admin)
app.use('/api/auditoria', auditRoutes);

// ============================================
// MIDDLEWARE DE AUDITORÍA
// Captura automáticamente POST, PUT, DELETE
// ============================================
app.use(auditMiddleware);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// RUTA NO ENCONTRADA (404)
// ============================================
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ============================================
// MANEJO DE ERRORES
// ============================================
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.statusCode || 500).json({
        error: 'Error del servidor',
        message: err.message
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📝 Auditoría: ACTIVADA`);
});

module.exports = app;