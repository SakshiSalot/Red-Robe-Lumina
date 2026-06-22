import mongoose from 'mongoose';

export const LOG_TYPES = [
    'SNAPSHOT',
    'ACTIVITY_DUMP',
    'TAB_SWITCH',
    'FULL_SCREEN_EXIT',
    'BLUR',
    'ANOMALY',
    'REPLAY',
];

const proctorLogSchema = new mongoose.Schema({
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    logType: { type: String, enum: LOG_TYPES },
    // Base64 image for SNAPSHOT / flagged events
    snapshotBase64: { type: String, default: null },
    // JSON string of rrweb events / activity for other types
    activityLogJson: { type: String, default: null },
});

export default mongoose.model('ProctorLog', proctorLogSchema);
