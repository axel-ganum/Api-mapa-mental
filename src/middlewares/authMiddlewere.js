// authMiddleware.js

export const verifyToken = (token) => {
    // Simulación de verificación de token básica
    if (token === 'token_de_prueba') {
        return { username: 'usuario_de_prueba' }; // Simulación de token decodificado
    }
    return null;
};
