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
import { createMindmap } from './src/routes/map.js';
import authenticateToken from './src/middlewares/authenticateToken.js';
dotenv.config();

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
        ws.user = await authenticateToken(token)
        console.log('Usuario autenticado:', ws.user)
    } catch (err) {
        console.error('Error al autenticar el token:', err);
        ws.close();
        return;
    }
    

    ws.on('message', async ( message) => {
         
         if (Buffer.isBuffer(message)) {
            console.log("Mensaje recibido como Buffer, conviertelo");
            message = message.toString();
       }
        
        try {
            const data = JSON.parse(message);
             
            console.log('Datos recividos:', JSON.stringify(data, null, 2));

            
             
        if (data.action === 'saveMap') {
                console.log("Tipo de accion saveMap reconocidos")
                if(data.payload) {
                    console.log("payload recibido:", JSON.stringify(data.payload, null, 2) )
                const {title, description, nodes, edges, thumbnail} = data.payload;
                 
                if (!title || !description || !Array.isArray(nodes) || !Array.isArray(edges) || !thumbnail)  {
                   console.log (2-"Datos insuficientes o mal formateados");
                   ws.send(JSON.stringify({type:'error', message: 'Datos insuficientes o mal formateados para crear el mapa'})) 
                   return
                }
                console.log('Guardar mapa mental con titulo:', title);
                console.log('Nodos:', nodes);
                console.log('Edges', edges)

                console.log('About to call createMindmap function');
                try {
                    console.log('Guardando mapa mental con titulo', title);
                    
                    const saveMindemap = await createMindmap({
                        title,
                        description,
                        nodes,
                        edges,
                        thumbnail,
                        userId: ws.user.id,

                    });ws.send(JSON.stringify({type: 'success', payload: saveMindemap}))
                    console.log('Map mental guardado:', saveMindemap)
    } catch (err) {
        console.error('Error al guardar el mapa mental', err)
      ws.send(JSON.stringify({type: 'error',message: 'Faild message format' }))
            }
        }else{
            console.log("No se encontro el payload en los datos recibidos ")
        }} else {
       
            ws.send(JSON.stringify({type: 'error', message: 'Error al guardar el mapa mental'}))
        
        
        }
    } catch (err) {
        ws.send(JSON.stringify({type: 'error', message: 'Invalid message format'}));
        console.error('Error al procesar el mansaje:' , err);
    }
}) 

    ws.on('close', () => {
        console.log('Cliente desconectado');

    });


});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servicio escuchando en el puerto ${PORT}`);
});
