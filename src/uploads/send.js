
import Notification from "../models/NotificationSchema.js"

export const sendPendingNotifications = async (userId, connectectedUsers) => {

    try {

        const pendingNotifications = await Notification.find({user: userId, seen: false});
        
        console.log(`Notificaciones pendientes encontradas: ${pendingNotifications.length}`);
        const userSocket = connectectedUsers[userId];

        if(userSocket) {
            console.log(`Usuario ${userId} esta conectado, enviando notificaciones pendinetes`);
            
            pendingNotifications.forEach((notification) => {
                console.log(`Enviando notificaciones: ${notification.message}`);
                
                userSocket.send(JSON.stringify({
                    action : 'notification', 
                    _id: notification._id,  
                    message: notification.message
                
                }));
                 console.log(`Notificaciones enviada:${notification.message}`)
            });

            await Notification.updateMany({user: userId, seen: false}, {seen:true});
            console.log(`se han enviado ${pendingNotifications.length} notificaciones pendientes al usuario con ID: ${userId}`);
            
        } else {
          console.log(`El usuario ${userId}no esta conectado, no se enviaron notificaciones.`);
          
        }
        
    } catch (error) {
        console.error("Error al enviar notificaciones pendientes:", error)
    }
}