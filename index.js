import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import auth  from './src/routes/auth.js';
import map from './src/routes/map.js';
import authMiddleware from './src/middlewares/authMiddleware.js'; // Corregido: Se cambió 'authMiddlewere' a 'authMiddleware'

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar', err));

app.use(bodyParser.json());

app.use('/auth', auth);
app.use('/map', authMiddleware, map); // Corregido: Se aplicó el middleware de autenticación a la ruta '/map'

wss.on('connection', (ws, req) => {
    const token = req.url.split('?token=')[1];
    const decoded = authMiddleware(token); // Corregido: Se cambió a usar el middleware directamente
    if (!decoded) {
        ws.close();
        return;
    }

    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servicio escuchando en el puerto ${PORT}`);
});
