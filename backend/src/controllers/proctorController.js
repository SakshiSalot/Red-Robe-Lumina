import mongoose from 'mongoose';
import Submission from '../models/Submission.js';
import ProctorLog from '../models/ProctorLog.js';

function buildLog(request) {
    const log = {
        submission: request.submissionId,
        timestamp: new Date(),
        logType: request.logType,
    };
    if (request.logType === 'SNAPSHOT') {
        log.snapshotBase64 = request.data; // Base64 image
    } else {
        log.activityLogJson = request.data; // JSON string of events
    }
    return log;
}

async function submissionExists(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const count = await Submission.countDocuments({ _id: id });
    return count > 0;
}

// POST /api/proctor/log  (single entry)
export async function logProctorEvent(req, res) {
    const request = req.body;
    if (!(await submissionExists(request.submissionId))) {
        console.warn(`Proctor log for unknown submission ID: ${request.submissionId}`);
        return res.send('Skipped - unknown submission');
    }
    await ProctorLog.create(buildLog(request));
    return res.send('Log Saved');
}

// POST /api/proctor/batch-log  (array of entries; invalid ones skipped)
export async function logBatch(req, res) {
    const requests = Array.isArray(req.body) ? req.body : [];
    const logs = [];
    for (const request of requests) {
        try {
            if (!(await submissionExists(request.submissionId))) {
                console.warn(`Skipping proctor log for unknown submission ID: ${request.submissionId}`);
                continue;
            }
            logs.push(buildLog(request));
        } catch (err) {
            console.warn(`Skipping proctor log entry due to error: ${err.message}`);
        }
    }
    if (logs.length) {
        await ProctorLog.insertMany(logs);
    }
    return res.status(200).end();
}
