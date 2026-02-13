const mongoose = require('mongoose');

const tournamentParticipantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true
    },
    currentBalance: {
        type: Number,
        required: true,
        default: 1000 // Should match tournament.startingBalance ideally
    },
    rank: {
        type: Number,
        default: 0 // 0 means unranked or pending calculation
    },
    tradesCount: {
        type: Number,
        default: 0
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

// Composite index to ensure a user joins a tournament only once
tournamentParticipantSchema.index({ userId: 1, tournamentId: 1 }, { unique: true });

// Index for leaderboard sorting
tournamentParticipantSchema.index({ tournamentId: 1, currentBalance: -1 });

module.exports = mongoose.models.TournamentParticipant || mongoose.model('TournamentParticipant', tournamentParticipantSchema);
