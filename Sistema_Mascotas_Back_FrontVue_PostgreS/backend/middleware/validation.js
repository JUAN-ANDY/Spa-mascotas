const { body, param, query, validationResult } = require('express-validator');

const validation = {
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Error de validación',
                errors: errors.array()
            });
        }
        next();
    },

    // Validaciones de autenticación
    loginRules: [
        body('email').isEmail().withMessage('Email inválido'),
        body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
    ],

    // Validaciones de usuario
    userRules: [
        body('email').isEmail().withMessage('Email inválido'),
        body('first_name').notEmpty().trim().withMessage('Nombre requerido'),
        body('last_name').notEmpty().trim().withMessage('Apellido requerido'),
        body('role').isIn(['Administrador', 'Recepcion', 'Groomer', 'Cliente'])
            .withMessage('Rol inválido'),
        body('phone').optional().isMobilePhone().withMessage('Teléfono inválido')
    ],

    // Validaciones de mascota
    petRules: [
        body('name').notEmpty().trim().withMessage('Nombre requerido'),
        body('species').notEmpty().withMessage('Especie requerida'),
        body('size').optional().isIn(['Pequeño', 'Mediano', 'Grande', 'Gigante']),
        body('vaccines_up_to_date').optional().isBoolean()
    ],

    // Validaciones de cita
    appointmentRules: [
        body('branch_id').isUUID().withMessage('Sucursal inválida'),
        body('client_id').isUUID().withMessage('Cliente inválido'),
        body('pet_id').isUUID().withMessage('Mascota inválida'),
        body('groomer_id').isUUID().withMessage('Groomer inválido'),
        body('service_id').isUUID().withMessage('Servicio inválido'),
        body('scheduled_start').isISO8601().withMessage('Fecha de inicio inválida'),
        body('total_price').isFloat({ min: 0 }).withMessage('Precio inválido')
    ],

    // Validaciones de producto
    productRules: [
        body('name').notEmpty().trim().withMessage('Nombre requerido'),
        body('category_id').optional().isUUID().withMessage('Categoría inválida'),
        body('description').optional().trim()
    ],

    // Validaciones de orden
    orderRules: [
        body('branch_id').isUUID().withMessage('Sucursal inválida'),
        body('client_id').optional().isUUID().withMessage('Cliente inválido'),
        body('total_amount').isFloat({ min: 0 }).withMessage('Monto inválido'),
        body('payment_method').optional().isIn(['Efectivo', 'QR', 'Transferencia', 'Tarjeta'])
    ]
};

module.exports = validation;