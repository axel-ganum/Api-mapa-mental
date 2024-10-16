import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import auth  from './src/routes/auth.js';
import map from './src/middlewares/veryfyToken.js';
import maps from './src/routes/maps.js'
import authMiddleware from './src/middlewares/authMiddleware.js'; // Corregido: Se cambió 'authMiddlewere' a 'authMiddleware'
import cors from 'cors';
import { createMindmap, getMapById, updateMindmap,deleteNodeFromDatabase, shareMapWithUser} from './src/routes/map.js';
import User from './src/models/userModel.js';
import authenticateToken from './src/middlewares/authenticateToken.js';
import Mindmap from './src/models/mapModel.js';
import  {sendPendingNotifications } from './src/uploads/send.js';
import Notification from './src/models/NotificationSchema.js';

dotenv.config();

const connectectedUsers = {};

const app = express();
app.use(cors({
    origin: 'http://localhost:5173'
  }));

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
app.use('/maps', authMiddleware, maps)

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
        // Convertir el mensaje a cadena de texto si es un Buffer
        if (Buffer.isBuffer(message)) {
            console.log("Mensaje recibido como Buffer, convirtiéndolo...");
            message = message.toString();
        }

        
        try {
            const data = JSON.parse(message);  // Intentar parsear el mensaje recibido
            console.log('Datos recibidos:', JSON.stringify(data, null, 2));
    
            // Manejo de la acción 'saveMap'
            if (data.action === 'saveMap') {
                console.log("Tipo de acción 'saveMap' reconocida");
                
                if (data.payload) {
                    console.log("Payload recibido:", JSON.stringify(data.payload, null, 2));
                    const { title, description, nodes, edges, thumbnail } = data.payload;
                     
                    // Validación de datos del payload
                    if (!title || !description || !Array.isArray(nodes) || !Array.isArray(edges) || !thumbnail) {
                        console.log("Datos insuficientes o mal formateados");
                        ws.send(JSON.stringify({ type: 'error', message: 'Datos insuficientes o mal formateados para crear el mapa' }));
                        return;
                    }
    
                    try {
                        // Intentar crear y guardar el mapa mental
                        console.log('Guardando mapa mental con título:', title);
                        const savedMindmap = await createMindmap({
                            title,
                            description,
                            nodes,
                            edges,
                            thumbnail,
                            userId: ws.user.id,
                        });
    
                        ws.send(JSON.stringify({ type: 'success', action:'saveMap', map: savedMindmap }));
                        console.log('Mapa mental guardado:', savedMindmap);
                    } catch (err) {
                        console.error('Error al guardar el mapa mental:', err);
                        ws.send(JSON.stringify({ type: 'error', message: 'Error al guardar el mapa mental' }));
                    }
                } else {
                    console.log("No se encontró el payload en los datos recibidos.");
                    ws.send(JSON.stringify({ type: 'error', message: 'Payload no proporcionado' }));
                }
    
            } 
            // Manejo de la acción 'getMap'
            else if (data.action === 'getMap') {
                console.log("Tipo de acción 'getMap' reconocida");
                const mapId = data.payload?.id;
    
                if (!mapId) {
                    ws.send(JSON.stringify({ type: 'error',  message: 'ID de mapa no proporcionado' }));
                    return; 
                }
    
                try {
                    // Intentar obtener el mapa por su ID
                    const map = await getMapById(mapId, ws.user.id);
                    if (!map) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Mapa no encontrado' }));
                        return;
                    }
                    
                    console.log('Enviando respuesta:', JSON.stringify({ type: 'success', map }))
                    ws.send(JSON.stringify({ type: 'success', action:'getMap', map }));
                } catch (err) {
                    console.error('Error al obtener el mapa:', err);
                    ws.send(JSON.stringify({ type: 'error', message: 'Error al obtener el mapa' }));
                }
    
            } 
            // Manejo de la acción 'updateMap'
            else if (data.action === 'updateMap') {
               console.log("Tipo de acción 'updateMap' reconocida");
               
               if(data.payload) {
                 const { id, title, description, nodes, edges, thumbnail } = data.payload;
    
                 if (!id || !title || !description || !Array.isArray(nodes) || !Array.isArray(edges)) {
                     ws.send(JSON.stringify({ type: 'error', message: 'Datos insuficientes o mal formateados para actualizar el mapa' }));
                     return;
                 }
                 
                 try {
                    console.log('Actualizando mapa mental con ID:', id);
                    const mindmap = await Mindmap.findById(id);

                    if(!mindmap) {
                        ws.send(JSON.stringify({type: 'error', message: 'No se pudo encontrar el mapa para actualizar'}));
                        return;
                    }

                    const isOwner = mindmap.user.toStrin() === ws.user.id;
                    const isSharedWithUser = mindmap.sharedWith.some(sharedUserId => sharedUserId.toString() === ws.user.id);

                    if(!isOwner && !isSharedWithUser) {
                        ws.send(JSON.stringify({type: 'error', message:'No tenes permiso para actualizar este mapa'}));
                        return
                    }
                    
                    mindmap.title = title;
                    mindmap.description = description;
                    mindmap.nodes = nodes;
                    mindmap.edges = edges;
                    mindmap.thumbnail = thumbnail;

                    await mindmap.save();
    
                  
                        ws.send(JSON.stringify({ type: 'success', action: 'updateMap', map: mindmap }));
                        console.log('Mapa mental actualizado:', mindmap);
                    
                    
                    
                 } catch (error) {
                    console.error('Error al actualizar el mapa mental:', error);
                    ws.send(JSON.stringify({ type: 'error', message: 'Error al actualizar el mapa mental' }));
                 }
               }
            } 
            // Manejo de la acción 'deleteNode'
            else if (data.action === 'deleteNode') {
                console.log("Tipo de acción 'deleteNode' reconocida");
    
                const nodeId = data.nodeId;
                if (!nodeId) {
                    ws.send(JSON.stringify({ type: 'error', message: 'ID de nodo no proporcionado' }));
                    return;
                }
    
                try {
                    // Intentar eliminar el nodo de la base de datos
                    await deleteNodeFromDatabase(nodeId);
                    console.log(`Nodo eliminado, enviando respuesta: ${nodeId}`)
                    ws.send(JSON.stringify({
                        type: 'success',
                        action: 'deleteNode',
                        nodeId: nodeId
                    }));
                    console.log(`Nodo con ID ${nodeId} eliminado exitosamente`);
                } catch (error) {
                    console.error('Error al eliminar nodo:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Error al eliminar nodo'
                    }));
                }
            } else if (data.action === 'shareMap') {
                console.log("Tipo de accion 'shareMap' reconocido");
                
                const {mapId, emailToShare} = data.payload;

                if(!mapId || !emailToShare) {
                    ws.send(JSON.stringify({type: 'error', message: 'Datos insuficientes para compartir el mapa'}));
                    return;
                }

                try {

                    const userToShare = await User.findOne({email: emailToShare.trim()});
                    if(!userToShare) {
                        ws.send(JSON.stringify({type: 'error', message: 'No se encontró un usuario con ese correo electrónico'}))
                    }
                    const result = await shareMapWithUser(mapId, emailToShare, connectectedUsers);

                    if(result.success) {
                        ws.send(JSON.stringify({type: 'success', action:'shareMap', message: result.message}));
                        console.log(`Mapa con ID ${mapId} compartido con el usuario ${userToShare.email}`);
                        
                    }
                } catch (error) {
                   console.error('Error al compartir el mapa:', error);
                   ws.send(JSON.stringify({action:'error', message: 'Error al compartir el mapa'}))
                }
            } else if (data.action === 'mark_as_read') { 
                console.log("Acción 'mark_as_read' recibida");
            
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
            
                    // Marcar la notificación como leída
                    notification.seen = true;
                    await notification.save();
            
                    // Obtener todas las notificaciones del usuario y contar las no leídas
                    const userNotifications = await Notification.find({ user: notification.user });
                    const unreadCount = userNotifications.filter(n => !n.seen).length;
            
                    // Enviar respuesta al cliente con la notificación actualizada y el recuento de no leídas
                    ws.send(JSON.stringify({
                        action: 'mark_as_read',
                        payload: {
                            notification: notification,
                            unreadCount: unreadCount
                        },
                        message: 'Notificación marcada como leída'
                    }));
            
                } catch (error) {
                    console.error('Error al marcar como leída:', error);
                    ws.send(JSON.stringify({ action: 'error', message: 'Error al marcar la notificación como leída' }));
                }
            }
            
            else {
                ws.send(JSON.stringify({ type: 'error', message: 'Acción desconocida' }));
            }
    
        } catch (error) {
            // Manejo de errores en el formato del mensaje
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
