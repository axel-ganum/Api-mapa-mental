import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
    },
    mindmap: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mindmap',
        required: true,
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Node',
        default: null,
    },
    children: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Node',
            default: [], 
        },
    ],
    edges: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Edge', 
            default: [], 
        }
    ]
}, {
    timestamps: true,
});


const Node = mongoose.model('Node', nodeSchema);

export default Node;

