import express from 'express';
import Mindmap from '../models/mapModel.js'; // Corregido: Se añadió el punto y coma al final de la importación
import Node from '../models/node.js'; // Corregido: Se añadió el punto y coma al final de la importación
import authMiddleware from '../middlewares/authMiddleware.js'; // Corregido: Se cambió 'authMiddlewere' a 'authMiddleware'

const router = express.Router();

router.use(authMiddleware);

router.post('/', async (req, res) => {
    const { title, description } = req.body;

    try {
        const newMindmap = new Mindmap({
            title,
            description,
            user: req.user.id
        });

        await newMindmap.save();
        res.status(201).json(newMindmap);
    } catch (err) {
        res.status(400).json({ error: 'Error al crear mapa mental' });
    }
});

router.get('/', async (req, res) => {
    try {
        const mindmaps = await Mindmap.find({ user: req.user.id });
        res.status(200).json(mindmaps);
    } catch (err) {
        res.status(400).json({ error: 'Error al obtener mapas mentales' });
    }
});

router.post('/:mindmapId/nodes', async (req, res) => {
    const { mindmapId } = req.params;
    const { content, parent, position } = req.body;
    try {
        const newNode = new Node({
            content,
            mindmap: mindmapId,
            parent,
            position,
        });
        await newNode.save();

        if (parent) {
            const parentNode = await Node.findById(parent);
            parentNode.children.push(newNode._id);
            await parentNode.save(); // Corregido: Se cambió 'parent.save()' a 'parentNode.save()'
        }
        res.status(201).json(newNode);
    } catch (err) {
        res.status(400).json({ error: 'Error al crear nodo' });
    }
});

router.get('/:mindmapId/nodes', async (req, res) => {
    const { mindmapId } = req.params;

    try {
        const nodes = await Node.find({ mindmap: mindmapId });
        res.status(200).json(nodes);
    } catch (err) {
        res.status(400).json({ error: 'Error al obtener nodos' });
    }
});

export default router;
