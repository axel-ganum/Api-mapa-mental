import express from 'express'
import User from '../models/userModel.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id, 'username email profilePicture theme stats');

        if (!user) {
            return res.status(404).json({message: 'Usuario no encontrado'})
            
        }

        res.json(user)
    } catch (error) {
        console.error('Error al obtener el perfill del usuario:', error);
        res.status(500).json({message: 'Error del servidor'})
    }
})

router.put('/', authMiddleware, async (req, res) => {
    const { profilePicture } = req.body;
   try {
    const updateUser = await User.findByIdAndUpdate(
        req.user.id,
        { profilePicture},
        {new: true}
    )
     
    if (!updateUser) {
        return res.status(404).json({message: 'Usuario no encontrado'})
        
    }

    res.json({message: 'Perfil actualizado', user: updateUser})
   } catch (error) {
       console.error('Error al actualizar el perfil:', error);
       res.status(500).json({message: 'Error al actualizar el perfil'})
   }
})

export default router;