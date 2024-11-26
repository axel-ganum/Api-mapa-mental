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
import Notification from './src/models/NotificationSchema.js';


dotenv.config();

const connectectedUsers = {};

const app = express();
app.use(cors({
    origin: ['http://localhost:5173','https://api-mapa-mental.onrender.com','http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
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
            const data = JSON.parse(message);  
            console.log('Datos recibidos:', JSON.stringify(data, null, 2));
    
           
            if (data.action === 'saveMap') {
                console.log("Tipo de acción 'saveMap' reconocida");
                
                if (data.payload) {
                    console.log("Payload recibido:", JSON.stringify(data.payload, null, 2));
                    const { title, description, nodes, edges, thumbnail } = data.payload;
                     
                 
                    if (!title || !description || !Array.isArray(nodes) || !Array.isArray(edges) || !thumbnail) {
                        console.log("Datos insuficientes o mal formateados");
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

                         await User.findByIdAndUpdate(ws.user.id, {
                         $inc: { 'stats.totalMapas': 1 }, 
                       }); 
                        
                       console.log('ID del usuario al guardar mapa:', ws.user.id);

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
            else if (data.action === 'getMap') {
                console.log("Tipo de acción 'getMap' reconocida");
                const mapId = data.payload?.id;
    
                if (!mapId) {
                    ws.send(JSON.stringify({ type: 'error',  message: 'ID de mapa no proporcionado' }));
                    return; 
                }
    
                try {

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
            else if (data.action === 'updateMap') {
                console.log("Tipo deacción 'updateMap' reconocida");
                
                if (data.payload) {
                    const { id, title, description, nodes, edges, thumbnail } = data.payload;
                    
                    // Validación de datos
                    if (!id || !Array.isArray(nodes) || !Array.isArray(edges) || !thumbnail) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Datos insuficientes o mal formateados para actualizar el mapa' }));
                        return;
                    }
                    
                    try {
                        console.log('Actualizando mapa mental con ID:', id);
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
                            console.log('Mapa mental actualizado con nodos y aristas poblados:', updatedMap);
                            
                            
                            ws.send(JSON.stringify({ type: 'success', action: 'updateMap', map: updatedMap }));
                            
                           
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN && client !== ws) { // Omitir al cliente que hizo la edición
                                    client.send(JSON.stringify({ type: 'success', action: 'mapUpdated', map: updatedMap }));
                                }
                            });
                            
                        } else {
                            ws.send(JSON.stringify({ type: 'error', message: 'No se pudo actualizar el mapa' }));
                        }
                    } catch (error) {
                        console.error('Error al actualizar el mapa mental:', error);
                        ws.send(JSON.stringify({ type: 'error', message: 'Error al actualizar el mapa mental' }));
                    }
                }
            }
                
            
            
            else if (data.action === 'deleteNode') {
                console.log("Tipo de acción 'deleteNode' reconocida");
                const mapId = data.mapId;
                const nodeId = data.nodeId;
                  console.log('mapId recibido:', mapId); 
                  console.log('nodeId recibido:', nodeId);
                    if (!nodeId) {
                    ws.send(JSON.stringify({ type: 'error', message: 'ID de nodo no proporcionado' }));
                    return;
                 }
    
                try {
                  
                    await deleteNodeFromDatabase(nodeId);
                    console.log(`Nodo eliminado, enviando respuesta: ${nodeId}`)
                    ws.send(JSON.stringify({
                        type: 'success',
                        action: 'deleteNode',
                        map: { _id:mapId},
                        nodeId: nodeId
                    }));

                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN && client !== ws) { 
                            client.send(JSON.stringify({ type: 'success', action: 'nodeDeleted',map: { _id:mapId} , nodeId: nodeId }));
                        }
                    });
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
                     
                    await User.findByIdAndUpdate(ws.user.id, {
                        $inc: { 'stats.sharesMpas': 1 },
                        
                    });

                    await User.findByIdAndUpdate(userToShare._id, {
                        $inc: { 'stats.activeCollaborations': 1 }
                    });
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
            
                   
                    notification.seen = true;
                    await notification.save();
            
                    
                    const userNotifications = await Notification.find({ user: notification.user });
                    const unreadCount = userNotifications.filter(n => !n.seen).length;
            
                    
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
