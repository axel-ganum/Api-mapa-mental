import jwt from 'jsonwebtoken';
import User from '../models/userModel.js'
import dotenv from 'dotenv';

dotenv.config();

const  authenticateToken = async ( token) => {
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECERET);
       
         console.log('Decoded token:', decoded)
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new 
            console.log('Usuario no encontrado');Error('usuario no encontrado')
        }
        console.log('Usuario autenticado:', user)
        return user;
    } catch (err) {
        console.log('Error en autenticación:', err.message)
        throw new Error('token invalido')
    }
};

export default authenticateToken;