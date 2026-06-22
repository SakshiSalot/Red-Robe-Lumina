import { createRequire } from 'module';

// pdf-parse is CommonJS; load it lazily via require so its debug-mode
// top-level file check never runs at import time.
const require = createRequire(import.meta.url);

export async function extractTextFromPdf(buffer) {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
}
