import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: false // Optional for Google Users
    },
    image: {
        type: String
    },
    balance: {
        type: Number,
        default: 10000 // Demo balance 10k
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    provider: {
        type: String,
        default: 'credentials'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent overwrite if model already exists (important for Next.js hot reload)
export default mongoose.models.User || mongoose.model('User', UserSchema);
