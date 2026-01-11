const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    password: {
        type: String,
        required: false, // Optional for OAuth users
        select: false,
    },
    image: {
        type: String,
    },
    balance: {
        type: Number,
        default: 10000,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
