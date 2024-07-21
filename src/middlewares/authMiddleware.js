import jwt from 'jsonwebtoken';
4
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');

    if(!token) {
        return res.status(401).json({message: 'Acceso denegado. No hay token prorcionado.'});

    }

    try {
        const decode = jwt.verify(token,process.env.JWT_SECERET );
        req.user = decode;
        next();
    } catch (err) {
       res.status(400).json({message: 'Token invalido'});
    }
}

export default authMiddleware;