/**
 * Script para crear el usuario admin inicial
 * Uso: node src/scripts/createAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const InvitationCode = require('../models/InvitationCode');
const crypto = require('crypto');

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    console.log(`Admin ya existe: ${adminEmail}`);
    await mongoose.disconnect();
    return;
  }

  // Crear código de invitación para el admin
  const code = 'ADMIN-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('hex');

  // Crear un usuario temporal para poder referenciar el admin
  const tempUser = new User({
    name: 'Admin',
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    invitationCode: code
  });

  // Crear el código con el id del usuario admin
  const invCode = new InvitationCode({
    code,
    createdBy: tempUser._id,
    used: true,
    usedBy: tempUser._id
  });

  await invCode.save();
  await tempUser.save();

  console.log('\n=== Admin creado exitosamente ===');
  console.log(`Email: ${adminEmail}`);
  console.log(`Contraseña: ${adminPassword}`);
  console.log('¡IMPORTANTE! Guarda esta contraseña de forma segura. No se volverá a mostrar.\n');

  await mongoose.disconnect();
}

createAdmin().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
