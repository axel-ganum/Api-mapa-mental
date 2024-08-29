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
    nodes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Node',
        },
    ],
thumbnail: {  
    type: String,  
    default: null,
},
},{ 
    timestamps: true,
});

const Mindmap = mongoose.model('Mindmap', mindmapSchema);

export default Mindmap;
