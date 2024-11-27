# Proyecto de Mapa Mental

Este proyecto es una aplicación para la creación, edición y gestión de mapas mentales colaborativos. Utiliza una combinación de tecnologías modernas como **Node.js**, **WebSockets**, **MongoDB** y un servidor REST para proporcionar funcionalidades en tiempo real y persistencia de datos.

## Características principales

- **Autenticación y autorización:** Gestión de usuarios con JWT (JSON Web Tokens).
- **WebSockets:** Comunicación en tiempo real para colaboración en mapas mentales.
- **CRUD de mapas mentales:** Crear, leer, actualizar y eliminar mapas mentales y nodos.
- **Colaboración:** Compartir mapas mentales con otros usuarios.
- **Notificaciones:** Notificaciones en tiempo real para eventos importantes.
- **Persistencia de datos:** Conexión a MongoDB para almacenar usuarios, mapas y notificaciones.

## Tecnologías utilizadas

- **Backend:** Node.js, Express
- **Base de datos:** MongoDB
- **WebSockets:** WebSocket y WebSocketServer
- **Middleware:** body-parser, dotenv, cors
- **Autenticación:** JSON Web Tokens

## Requisitos previos

1. Tener instalado [Node.js](https://nodejs.org/) y npm.
2. Tener acceso a una instancia de MongoDB (local o en la nube).
3. Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
MONGO_URI=tu_uri_de_mongodb
PORT=puerto_del_servidor (opcional, por defecto 3000)
```

## Instalación

1. Clona este repositorio:

   ```bash
   git clone https://github.com/tu_usuario/tu_repositorio.git
   cd tu_repositorio
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Inicia el servidor:

   ```bash
   npm start
   ```

4. El servidor estará disponible en `http://localhost:3000` (o el puerto configurado en `.env`).

## Endpoints principales

### Rutas públicas

- `POST /auth/register`: Registro de usuarios.
- `POST /auth/login`: Inicio de sesión.

### Rutas protegidas (requieren autenticación)

- `GET /maps`: Obtiene todos los mapas del usuario.
- `POST /map`: Crea un nuevo mapa mental.
- `PUT /map`: Actualiza un mapa existente.
- `DELETE /map`: Elimina un mapa.
- `POST /map/share`: Comparte un mapa con otro usuario.

## Uso de WebSockets

El servidor incluye soporte para WebSockets, permitiendo:

- Notificaciones en tiempo real.
- Colaboración simultánea en mapas mentales.

### Eventos WebSocket

- `saveMap`: Guarda un nuevo mapa mental.
- `getMap`: Obtiene un mapa mental específico.
- `updateMap`: Actualiza un mapa mental existente.
- `deleteNode`: Elimina un nodo de un mapa.
- `shareMap`: Comparte un mapa mental con otro usuario.
- `mark_as_read`: Marca una notificación como leída.

##
