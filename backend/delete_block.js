const fs = require('fs');
const path = 'server.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

// Target lines 91 to 250 (1-based) -> Indices 90 to 249
// Check if lines match expectations to be safe
if (lines[90].trim() === '/*' && lines[249].trim() === '*/') {
    lines.splice(90, 249 - 90 + 1);
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Successfully deleted the block.');
} else {
    console.error('Safety check failed. Lines do not match expectation.');
    console.log('Line 91:', lines[90]);
    console.log('Line 250:', lines[249]);
}
