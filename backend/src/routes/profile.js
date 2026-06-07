const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/profile — datos del usuario actual
router.get('/', auth, async (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, sector: req.user.sector || '' });
});

// PUT /api/profile — actualizar nombre y sector
router.put('/', auth, async (req, res) => {
  try {
    const { name, sector } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'El nombre es requerido' });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim(), sector: (sector || '').trim() },
      { new: true }
    ).select('-password');
    res.json({ name: user.name, sector: user.sector });
  } catch (err) {
    res.status(500).json({ message: 'Error actualizando perfil' });
  }
});

// PUT /api/profile/password — cambiar contraseña (requiere la actual)
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Faltan campos' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });

    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ message: 'La contraseña actual es incorrecta' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error cambiando contraseña' });
  }
});

module.exports = router;
