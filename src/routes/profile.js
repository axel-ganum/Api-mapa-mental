import express from 'express'
import User from '../models/userModel.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../config/multer.js';
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id, 'username email profilePicture theme stats');

        if (!user) {
            return res.status(404).json({message: 'Usuario no encontrado'})
            
        }
        console.log('Datos del perfil:', user);
        res.json(user)
    } catch (error) {
        console.error('Error al obtener el perfill del usuario:', error);
        res.status(500).json({message: 'Error del servidor'})
    }
})

router.put('/', authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
      const { theme } = req.body;
      const userId = req.user.id;
  
      const updateData = { theme };
  
      if (req.file) {
        console.log('Archivo subido:', req.file);
        updateData.profilePicture = `/storage/${req.file.filename}`;
      }
  
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      res.json({ message: 'Perfil actualizado', user: updatedUser });
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
  });

export default router;