const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Error de PostgreSQL
    if (err.code && err.code.startsWith('23')) {
        return res.status(409).json({
            error: 'Error de integridad',
            message: 'Violación de restricción en la base de datos',
            detail: err.detail
        });
    }

    // Error de validación
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            message: err.message,
            errors: err.errors
        });
    }

    // Error por defecto
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error inesperado',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;