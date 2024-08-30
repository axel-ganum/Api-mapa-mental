import express from 'express';
import Mindmap from '../models/mapModel.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/all', authMiddleware, async(req, res) => {
try {
    const userId = req.user.id
    const maps = await Mindmap.find({user: userId}, 'title description createAt updatedAt thumbnail')
    .populate('user', 'username')
    .select('title description createdAt updatedAt thumbnail user')
    
    res.json(maps)

}catch (error) {
    res.status(500).json({messages: 'Error al obtener los mapas'})
}
}) ;


export default router;