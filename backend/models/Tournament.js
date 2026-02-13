const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    entryFee: {
        type: Number,
        required: true,
        default: 0
    },
    prizePool: {
        type: Number,
        required: true,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    startingBalance: {
        type: Number,
        default: 1000 // Chips/Demo money for the tournament
    },
    participantCount: {
        type: Number,
        default: 0
    },
    minParticipants: {
        type: Number,
        default: 2
    },
    maxParticipants: {
        type: Number,
        default: 1000
    },
    status: {
        type: String,
        enum: ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
        default: 'UPCOMING'
    },
    winnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    allowedAssets: {
        type: [String],
        default: [] // Empty means all allowed
    },
    allowedTimeframes: {
        type: [String],
        default: [] // Empty means all allowed
    }
});

// Index for efficient querying by status and time
tournamentSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema);
