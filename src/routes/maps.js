import express from 'express';
import Mindmap from '../models/mapModel.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import User from '../models/userModel.js';

const router = express.Router();

router.get('/all', authMiddleware, async(req, res) => {
try {
    const userId = req.user.id
    const maps = await Mindmap.find({user: userId}, 'title description createAt updatedAt thumbnail')
    .populate('user', '_id username')
    .select('title description createdAt updatedAt thumbnail user')
    .lean()
    .then(maps => maps.map(map => ({...map,isOwner: true})));

    const shareMaps = await Mindmap.find({sharedWith: userId}, 'title description createdAt updatedAt thumbnail' )
    .populate('user', '_id username',)
    .select('title description createdAt updatedAt thumbnail user')
    .lean()
    .then(shareMaps => shareMaps.map(map => ({ ...map, isOwner:false})));
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

        const user = await User.findById(userId)

        if(user.stats.totalMapas > 0){
            await User.findByIdAndUpdate(userId, {
                $inc: {'stats.totalMapas': -1}
            })
        }

        if(user.stats.sharesMpas > 0 && map.sharedWith) {
         await User.findByIdAndUpdate(userId, {
             $inc: {'stats.sharesMpas': -1}
         })
        }
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





export default router;