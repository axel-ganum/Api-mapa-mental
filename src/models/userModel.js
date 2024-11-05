import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
        default: null,
    },
    stats: {
        totalMapas: { type: Number, default: 0 },
        sharesMpas: { type: Number, default: 0 },
        activeCollaborations: { type: Number, default: 0 },
    }
}
, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

export default User; // Aquí exportamos el modelo User

// No es necesario exportar `userSchema` a menos que lo necesites para otro propósito

