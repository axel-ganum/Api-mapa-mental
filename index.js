import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import auth  from './src/routes/auth.js';
import map from './src/middlewares/veryfyToken.js';
import maps from './src/routes/maps.js';
import profile from './src/routes/profile.js'
import authMiddleware from './src/middlewares/authMiddleware.js';
import cors from 'cors';
import { createMindmap, getMapById, updateMindmap,deleteNodeFromDatabase, shareMapWithUser} from './src/routes/map.js';
import User from './src/models/userModel.js';
import authenticateToken from './src/middlewares/authenticateToken.js';
import  {sendPendingNotifications } from './src/uploads/send.js';
import path from 'path'
import Notification from './src/models/NotificationSchema.js';


dotenv.config();

const connectectedUsers = {};

const app = express();
app.use(cors({
    origin: ['http://localhost:5173','https://api-mapa-mental.onrender.com','http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar', err));

app.use(bodyParser.json());
app.use('/storage', express.static(path.resolve('storage')))
app.use('/auth', auth);
app.use('/map', authMiddleware, map); 
app.use('/maps', authMiddleware, maps )
app.use('/perfil', authMiddleware, profile)

wss.on('connection', async (ws, req) => {
    const token = req.url.split('?token=')[1];
    console.log('Token recibido:', token);
    
    try {
        const user = await authenticateToken(token)
        ws.user = user
        console.log('Usuario autenticado:', ws.user)
    
       
        connectectedUsers[ws.user.id] = ws;

        sendPendingNotifications(ws.user.id, connectectedUsers);
       
    
    } catch (err) {
        console.error('Error al autenticar el token:', err);
        ws.close();
        return;
    }
    
    ws.on('message', async (message) => {
       
        if (Buffer.isBuffer(message)) {
            console.log("Mensaje recibido como Buffer, convirtiéndolo...");
            message = message.toString();
        }

        
        try {
            const data = JSON.parse(message);  // Intentar parsear el mensaje recibido
            console.log('Datos recibidos:', JSON.stringify(data, null, 2));
    
           
            switch (data.action) {
                case 'saveMap':
                    console.log("Tipo de acción 'saveMap' reconocida");
                    if (data.payload) {
                        const { title, description, nodes, edges, thumbnail } = data.payload;
                        if (!title || !description || !Array.isArray(nodes) || !Array.isArray(edges) || !thumbnail) {
                            ws.send(JSON.stringify({ type: 'error', message: 'Datos insuficientes o mal formateados para crear el mapa' }));
                            return;
                        }
                        try {
                            console.log('Guardando mapa mental con título:', title);
                            const savedMindmap = await createMindmap({
                                title,
                                description,
                                nodes,
                                edges,
                                thumbnail,
                                userId: ws.user.id,
                            });
                            await User.findByIdAndUpdate(ws.user.id, { $inc: { 'stats.totalMapas': 1 } });
        
                            ws.send(JSON.stringify({ type: 'success', action: 'saveMap', map: savedMindmap }));
                            console.log('Mapa mental guardado:', savedMindmap);
                        } catch (err) {
                            console.error('Error al guardar el mapa mental:', err);
                            ws.send(JSON.stringify({ type: 'error', message: 'Error al guardar el mapa mental' }));
                        }
                    }
                    break;
        
                case 'getMap':
                    const mapaId = data.payload?.id;
                    if (!mapaId) {
                        ws.send(JSON.stringify({ type: 'error', message: 'ID de mapa no proporcionado' }));
                        return;
                    }
                    try {
                        const map = await getMapById(mapaId, ws.user.id);
                        if (!map) {
                            ws.send(JSON.stringify({ type: 'error', message: 'Mapa no encontrado' }));
                            return;
                        }
                        ws.send(JSON.stringify({ type: 'success', action: 'getMap', map }));
                    } catch (err) {
                        console.error('Error al obtener el mapa:', err);
                        ws.send(JSON.stringify({ type: 'error', message: 'Error al obtener el mapa' }));
                    }
                    break;
        
                case 'updateMap':
                    const { id, title, description, nodes, edges, thumbnail } = data.payload;
                    if (!id || !Array.isArray(nodes) || !Array.isArray(edges) || !thumbnail) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Datos insuficientes o mal formateados para actualizar el mapa' }));
                        return;
                    }
                    try {
                        const updatedMap = await updateMindmap({
                            id,
                            title,
                            description,
                            nodes,
                            edges,
                            thumbnail,
                            userId: ws.user.id,
                        });
                        if (updatedMap) {
                            ws.send(JSON.stringify({ type: 'success', action: 'updateMap', map: updatedMap }));
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN && client !== ws) {
                                    client.send(JSON.stringify({ type: 'success', action: 'mapUpdated', map: updatedMap }));
                                }
                            });
                        } else {
                            ws.send(JSON.stringify({ type: 'error', message: 'No se pudo actualizar el mapa' }));
                        }
                    } catch (error) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Error al actualizar el mapa mental' }));
                    }
                    break;
        
                case 'deleteNode':
                    const { mapId, nodeId } = data;
                    if (!nodeId) {
                        ws.send(JSON.stringify({ type: 'error', message: 'ID de nodo no proporcionado' }));
                        return;
                    }
                    try {
                        await deleteNodeFromDatabase(nodeId);
                        ws.send(JSON.stringify({ type: 'success', action: 'deleteNode', map: { _id: mapId }, nodeId }));
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN && client !== ws) {
                                client.send(JSON.stringify({ type: 'success', action: 'nodeDeleted', map: { _id: mapId }, nodeId }));
                            }
                        });
                    } catch (error) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Error al eliminar nodo' }));
                    }
                    break;
        
                case 'shareMap':
                    const { emailToShare } = data.payload;
                    if (!mapId || !emailToShare) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Datos insuficientes para compartir el mapa' }));
                        return;
                    }
                    try {
                        const userToShare = await User.findOne({ email: emailToShare.trim() });
                        if (!userToShare) {
                            ws.send(JSON.stringify({ type: 'error', message: 'No se encontró un usuario con ese correo electrónico' }));
                            return;
                        }
                        await shareMapWithUser(mapId, emailToShare, connectectedUsers);
                        ws.send(JSON.stringify({ type: 'success', action: 'shareMap', message: 'Mapa compartido correctamente' }));
                    } catch (error) {
                        ws.send(JSON.stringify({ action: 'error', message: 'Error al compartir el mapa' }));
                    }
                    break;
        
                case 'mark_as_read':
                    const { notificationId } = data;
                    if (!notificationId) {
                        ws.send(JSON.stringify({ action: 'error', message: 'ID de notificación no proporcionado' }));
                        return;
                    }
                    try {
                        const notification = await Notification.findById(notificationId);
                        if (!notification) {
                            ws.send(JSON.stringify({ action: 'error', message: 'Notificación no encontrada' }));
                            return;
                        }
                        notification.seen = true;
                        await notification.save();
                        const unreadCount = await Notification.countDocuments({ user: notification.user, seen: false });
                        ws.send(JSON.stringify({ action: 'mark_as_read', payload: { notification, unreadCount }, message: 'Notificación marcada como leída' }));
                    } catch (error) {
                        ws.send(JSON.stringify({ action: 'error', message: 'Error al marcar la notificación como leída' }));
                    }
                    break;
        
                default:
                    ws.send(JSON.stringify({ type: 'error', message: 'Acción desconocida' }));
            }
        } catch (error) {
            ws.send(JSON.stringify({ action: 'error', message: 'Formato de mensaje inválido' }));
            console.error('Error al procesar el mensaje:', error);
        }
    });
    
            
        
 

    ws.on('close', () => {
        if(connectectedUsers[ws.user.id]){
            delete connectectedUsers[ws.user.id];
        }
        console.log('Cliente desconectado');
    });


});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servicio escuchando en el puerto ${PORT}`);
});
