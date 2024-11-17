import mongoose from 'mongoose';

const mindmapSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sharedWith: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ],
    nodes: [
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
        },
    ],
    thumbnail: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});


const Mindmap = mongoose.model('Mindmap', mindmapSchema);

export default Mindmap;
