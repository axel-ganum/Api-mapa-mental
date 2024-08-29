import jwt from 'jsonwebtoken';

const veryfyToken = (token) => {
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECERET );
        return decoded
    } catch (err) {
        return null;
    }
};

export default veryfyToken