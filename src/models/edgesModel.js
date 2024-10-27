import mongoose from 'mongoose';

const edgeSchema = new mongoose.Schema({
    source: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Node',
        required: true,
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Node',
        required: true,
    },
    mindmap: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mindmap',
        required: true,
    },
}, {
    timestamps: true,
});


const Edge = mongoose.model('Edge', edgeSchema);

export default Edge;
