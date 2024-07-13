import express from 'express';
import { register, login } from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddlewere.js';
import { User } from '../models/userModel.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.post('/register', upload.single('profilePicture'), register);
router.post('/login', login);


router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture ? `data:image/jpeg;base64,${user.profilePicture.toString('base64')}` : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los datos del usuario', error });
    }
});

export default router;
