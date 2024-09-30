import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    user:{type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    message: {type: String, required: true},
    seen: {type: Boolean, default: false},
    CreaeAt: {type: Date, default: Date.now},
});

const Notication = mongoose.model('Notification', NotificationSchema);

export default Notication;