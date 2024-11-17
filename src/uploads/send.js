
import Notification from "../models/NotificationSchema.js"
export const sendPendingNotifications = async (userId, connectedUsers) => {
    try {
     
        const pendingNotifications = await Notification.find({ user: userId, seen: false });
        console.log(`Notificaciones pendientes encontradas: ${pendingNotifications.length}`);
        
        const userSocket = connectedUsers[userId];

        if (userSocket) {
            console.log(`Usuario ${userId} está conectado, enviando notificaciones pendientes`);

            
            for (const notification of pendingNotifications) {
                console.log(`Enviando notificación: ${notification.message}`);
                
                await userSocket.send(JSON.stringify({
                    action: 'notification',
                    _id: notification._id,
                    message: notification.message
                }));
                
                console.log(`Notificación enviada: ${notification.message}`);
            }

         
            const updateResult = await Notification.updateMany(
                { user: userId, seen: false },
                { seen: true }
            );
            console.log(`Se han actualizado ${updateResult.modifiedCount} notificaciones a vistas para el usuario con ID: ${userId}`);
            
        } else {
            console.log(`El usuario ${userId} no está conectado, no se enviaron notificaciones.`);
        }

    } catch (error) {
        console.error("Error al enviar notificaciones pendientes:", error);
    }
}
