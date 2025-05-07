// Logging utility for writing both to console and a log file

const fs = require('fs');
const path = require('path');

// Where the log file should be saved (inside a 'logs' folder)
const logFilePath = path.join(__dirname, 'logs', 'service.log');

// Make sure the 'logs' folder exists (create it if needed)
fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

// Main log function – adds a timestamp and writes to console + file
function log(message) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${message}`;

  // Show the message in the terminal
  console.log(formatted);

  // Also write it to the service log file
  fs.appendFile(logFilePath, formatted + '\n', (err) => {
    if (err) {
      console.error(`[Logger Error] Couldn't write to file:`, err.message);
    }
  });
}

// Export the log function so I can use it anywhere
module.exports = { log };