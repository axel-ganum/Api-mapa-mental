import mongoose from 'mongoose';


const mindamapaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    desciption : {
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

},{
    timestamps: true,


})
 
export const Mindmap = mongoose.model('Mindmap', mindamapaSchema)