const nodemailer = require('nodemailer');

// Crear transporter con configuración directa
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'juanvalez56@gmail.com',
        pass: '0123aNDY+'  // Tu contraseña real
        //pass: 'abcd efgh ijkl mnop' 
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verificar conexión
transporter.verify()
    .then(() => console.log('✅ Servidor de correos CONECTADO'))
    .catch((err) => console.log('⚠️ Correos no disponibles:', err.message));

async function sendEmail({ to, subject, html }) {
    try {
        const info = await transporter.sendMail({
            from: '"SPA Mascotas" <juanvalez56@gmail.com>',
            to: to,
            subject: subject,
            html: html
        });
        console.log('📧 Correo ENVIADO a:', to);
        return { success: true };
    } catch (error) {
        console.log('❌ No se pudo enviar a:', to, '-', error.message);
        return { success: false };
    }
}

async function sendWelcomeEmail(user, password = null) {
    const roleNames = {
        'Administrador': 'Administrador',
        'Recepcion': 'Recepcionista',
        'Groomer': 'Groomer',
        'Cliente': 'Cliente'
    };
    const roleName = roleNames[user.role] || 'Usuario';

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:20px auto;background:white;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#4e73df,#3a5ccc);padding:30px;text-align:center;color:white;">
            <div style="font-size:50px;">🐾</div>
            <h1 style="margin:10px 0 0;">SPA Mascotas</h1>
            <p style="margin:5px 0 0;opacity:0.9;">Sistema de Gestión</p>
        </div>
        <div style="padding:25px;">
            <h2 style="color:#1a1a2e;">¡Bienvenido, ${user.first_name}!</h2>
            <p style="color:#5a5c69;">Tu cuenta como <strong>${roleName}</strong> ha sido creada exitosamente.</p>
            <div style="background:#f8f9fc;padding:15px;border-radius:8px;margin:15px 0;">
                <p><strong>📧 Email:</strong> ${user.email}</p>
                <p><strong>👤 Rol:</strong> ${roleName}</p>
                ${user.phone ? `<p><strong>📱 Teléfono:</strong> ${user.phone}</p>` : ''}
                ${user.turno ? `<p><strong>⏰ Turno:</strong> ${user.turno === 'Mañana' ? '🌅 8:00 - 14:00' : '🌇 14:00 - 21:00'}</p>` : ''}
            </div>
            ${password ? `
            <div style="background:#e8f0fe;padding:15px;border-radius:8px;text-align:center;margin:15px 0;">
                <p><strong>🔑 Tus credenciales:</strong></p>
                <p>Email: <code style="font-size:16px;color:#4e73df;">${user.email}</code></p>
                <p>Contraseña: <code style="font-size:16px;color:#4e73df;">${password}</code></p>
            </div>
            ` : ''}
            <p style="color:#5a5c69;">Accede al sistema desde:</p>
            <a href="http://localhost:5173" style="display:inline-block;background:linear-gradient(135deg,#4e73df,#3a5ccc);color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">🔗 Iniciar Sesión</a>
        </div>
        <div style="text-align:center;padding:15px;background:#f8f9fc;color:#adb5bd;font-size:12px;">
            <p>© 2026 SPA Mascotas - Todos los derechos reservados</p>
        </div>
    </div>`;

    console.log('📧 Enviando correo de bienvenida a:', user.email);
    return sendEmail({
        to: user.email,
        subject: '🐾 ¡Bienvenido a SPA Mascotas, ' + user.first_name + '!',
        html: html
    });
}

async function sendNewUserNotificationToAdmin(user) {
    const roleNames = {
        'Administrador': 'Administrador',
        'Recepcion': 'Recepcionista',
        'Groomer': 'Groomer',
        'Cliente': 'Cliente'
    };
    const roleName = roleNames[user.role] || 'Usuario';

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:20px auto;background:white;padding:25px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color:#4e73df;">🐾 Nuevo Usuario Registrado</h2>
        <p>Se ha registrado un nuevo usuario en <strong>SPA Mascotas</strong>:</p>
        <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Nombre:</strong></td><td>${user.first_name} ${user.last_name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Email:</strong></td><td>${user.email}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Rol:</strong></td><td>${roleName}</td></tr>
            ${user.phone ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Teléfono:</strong></td><td>${user.phone}</td></tr>` : ''}
            <tr><td style="padding:8px;"><strong>Fecha:</strong></td><td>${new Date().toLocaleString('es-BO')}</td></tr>
        </table>
    </div>`;

    console.log('📧 Enviando notificación al admin:', process.env.ADMIN_EMAIL || 'admin@spa.com');
    return sendEmail({
        to: process.env.ADMIN_EMAIL || 'juanvalez56@gmail.com',
        subject: '🔔 Nuevo ' + roleName + ': ' + user.first_name + ' ' + user.last_name,
        html: html
    });
}

module.exports = { sendEmail, sendWelcomeEmail, sendNewUserNotificationToAdmin };