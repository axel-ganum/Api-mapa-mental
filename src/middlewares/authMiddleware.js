import jwt from 'jsonwebtoken';
import authenticateToken from './authenticateToken.js';

const authMiddleware = async (req, res, next) => {
   const token = req.headers.authorization?.split(' ')[1];

   if(!token) {
    return res.status(400).json({message: 'token no proporcionado'});
   }

   try {
    req.user = await authenticateToken(token);
    next() 
   } catch (err) {
    res.status(400).json({message: err.message})
   }
}

export default authMiddleware;
