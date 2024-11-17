import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js'; 



export const register = async (req, res) => {
    const { username, email, password } = req.body;
    const profilePicture = req.file ? req.file.buffer : null;

    try {
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

   
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            profilePicture
        });

        await newUser.save();

        res.status(201).json({ message: 'Usuario registrado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el registro de usuario', error });
    }
};


export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        
        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECERET, { expiresIn: '7d' });

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error en el inicio de sesión', error });
    }
};

