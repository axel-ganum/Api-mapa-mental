
import mongose from 'mongose';

const userSchema = new mongose.Schema({
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
        default: null            
    }
}, {
    timestamps: true,
});

 export const User = mongose.model('User', userSchema);