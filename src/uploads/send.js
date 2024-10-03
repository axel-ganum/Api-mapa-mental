import { type } from "os";
import Notification from "../models/NotificationSchema"

export const sendPendingNotifications = async (userId) => {

    try {

        const pendingNotifications = await Notification.find({user: userId, seen: false});

        const userSocket = connectedUsers[userId];

        if(userSocket) {
            pendingNotifications.forEach((notification) => {
                userSocket.send(JSON.stringify({
                    type: 'notification',
                    message: notification.message
                }))
            });

            await Notification.updateMany({user: userId, seen: false}, {seen:true});
            console.log(`se han enviado ${pendingNotifications} notificaciones pendientes al usuario con ID: ${userId}`);
            
        } else {
          console.log("El usuario no esta conectado, no se enviaron notificaciones.");
          
        }
        
    } catch (error) {
        console.error("Error al enviar notificaciones pendientes:", error)
    }
}