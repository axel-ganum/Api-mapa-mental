import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import {auth} from './src/routes/auth.js';
import {map} from './src/routes/map.js';
import {authMiddlewere} from './src/middlewares/authMiddlewere.js';


dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server })

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('conetado a mongoDB'))
  .catch((err)=> console.error('Error al conector'));
  app.use(bodyParser.json());
  
  app.use('/auth' , auth);
  app.use('/map', map);

  wss.on('connection', (ws, req) => {
    const token = req.url.split('?token=')[1];
    const decoded = authMiddlewere(token);
    if(!decoded) {
        ws.close();
        return;
    }

    ws.on('close', () => {
        console.log('Cliente desconectaado')
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`servicio escuchando den el puerto ${PORT}`)
  })