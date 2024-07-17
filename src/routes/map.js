import express from 'express';
import { Mindmap } from '../models/mapModel';
import { Node } from '../models/node';
import authMiddlewere from '../middlewares/authMiddlewere'

const router = express.Router();

router.use(authMiddlewere)

router.post('/', async (req, res) => {
const {title, description} = req.body;

try {
    const newMindmap = new Mindmap ({
        title,
        description,
        user: req.user.id
    });

    await newMindmap.save();
    res.status(201).json(newMindmap);
} catch (err) {
    res.status(400).json({error: 'Error al crear mapa mental'})
}
});

router.get('/', async (req, res) => {
    try {
        const mindmaps = await Mindmap.find({user: req.user.id});
        res.status(200).json(mindmaps);
    } catch (err) {
        res.status(400).json({error: 'Error al obtener mapas mentales'});
    }
});

router.post('/:mindmapaId/nodes', async (req, res) => {
    const {mindmapId} = req.params;
    const {content, parent, position} = req.body;
    try {
        const newNode = new Node ({
            content,
            mindmap: mindmapId,
            parent,
            position,
        });
        await newNode.save();

        if (parent) {
            const parentNode = await Node.findById(parent);
            parentNode.children.push(newNode._id);
            await parent.save();
        }
        res.status(201).json(newNode)
    } catch (err) {
        res.status(400).json({error: 'Error al crear nodo'})
    }
})

router.get('/:mindmapId/nodes', async (req, res) => {
    const {mindmapId} = req.params;

    try {
        const nodes = await Node.find({mindmap: mindmapId});
        res.status(200).json(nodes);
    } catch (err) {
        res.status(400).json({error: 'Error al obtener nodos'})

    }
})

export default router;