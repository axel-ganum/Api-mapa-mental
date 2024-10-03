import express from 'express';
import Mindmap from '../models/mapModel.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import Notication from '../models/NotificationSchema.js';
const router = express.Router();

router.get('/all', authMiddleware, async(req, res) => {
try {
    const userId = req.user.id
    const maps = await Mindmap.find({user: userId}, 'title description createAt updatedAt thumbnail')
    .populate('user', 'username')
    .select('title description createdAt updatedAt thumbnail user')
    
    const shareMaps = await Mindmap.find({sharedWith: userId}, 'title description createdAt updatedAt thumbnail' )
    .populate('user', 'username')
    .select('title description createdAt updatedAt thumbnail user');

    const allMaps = maps.concat(shareMaps);
    res.json(allMaps)

}catch (error) {
    res.status(500).json({messages: 'Error al obtener los mapas'})
}
}) ;

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const mapId = req.params.id;

        const map = await Mindmap.findOne({_id: mapId, user: userId});
        if(!map) {
       return res.status(404).json({messages: 'Mapa no encontrado o no autorizado para eliminar'});

        }
        
        await Mindmap.findByIdAndDelete(mapId);
        res.status(200).json({messages: 'Mapa eliminado exitosammente'})
    } catch (error) {
        console.error('Error al eliminar el mapa');
        
    }
});

router.get('/maps/:mapid', authMiddleware, async (req, res) => {
    const {mapId} = req.params;

    try {
     const mindmap = await Mindmap.findById(mapId).populate('sharedWith', 'username email');
     if(!mindmap) {
        return res.status(404).json({message: 'Mapa no encontrado'})
     }

     res.json(mindmap)
    } catch (error) {
        res.status(500).json({message: 'Error al obtener el mapa'})
    }
})


 router.get('/notifications', authMiddleware, async(req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notication.find({user: userId, seen: false}).sort({createdAt: -1});
        res.json(notifications);
    }catch (error) {
        res.status(500).json({message:'Error al obtener las notificaciones'})
    }
 })

 router.put('/notifications/:id', authMiddleware, async (req, res) => {
    try {
        const notificationId = req.params.id;
        await Notication.findByIdAndUpdate(notificationId, {seen: true});
          res.json({succes: true, message: 'Notificación marcada como leida'})
    } catch (error) {
        res.status(500).json({message: 'Error al marcar la notificación como leida'})
    }
 })

 router.get('/unread', authMiddleware, async (req,res) => {
    try {
        const userId = req.user.id;

        const notificationsCount = await Notification.countDocuments({user: userId, seen: false  });

        res.status(200).json({unreadCount: notificationsCount});
    } catch (error) {
        console.error('Error al obtener notificaciones no leidas' ,error);
        res.status(500).json({error:'Error al obtener las notificaciones'});
    }
 })
export default router;