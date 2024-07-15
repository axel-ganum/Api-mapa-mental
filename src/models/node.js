import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
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
        },
    ],
    position: {
        x: {
            type: Number,
            required: true,
        },
        y: {
            type: Number,
            required: true,
        },
    },
},
 {
    timestamps: true,
 },
);

export const Node = mongoose.model('Node', nodeSchema)