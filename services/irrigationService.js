// Irrigation service logic

// Import my new log function
const { log } = require('../logger'); 
const VALID_API_KEY = "farmkey123";

// Helper for unary RPCs
function isAuthorized(call, callback) {
  const key = call.metadata.get('api-key')[0];
  if (key !== VALID_API_KEY) {
    log("Unauthorized attempt to access irrigation service");
    callback({ code: 7, message: 'Unauthorized: Invalid API key' });
    return false;
  }
  return true;
}

// Simulated Greenhouse Data
const greenhouses = {
    "Greenhouse 1": { name: "Greenhouse 1", moistureLevel: 42.5, litresUsed: 120.0, isIrrigating: false },
    "Greenhouse 2": { name: "Greenhouse 2", moistureLevel: 38.0, litresUsed: 95.0, isIrrigating: false },
    "Greenhouse 3": { name: "Greenhouse 3", moistureLevel: 55.0, litresUsed: 80.0, isIrrigating: false }
};

// Moisture simulation: update irrigating greenhouses every 5 seconds
setInterval(() => {
    Object.values(greenhouses).forEach(g => {
        if (g.isIrrigating) {
            g.moistureLevel = Math.min(100, g.moistureLevel + (Math.random() * 1.5 + 0.5));
            g.litresUsed += Math.random() * 5 + 2;
        }
    });
}, 5000);

// Unary: Get soil moisture for a single greenhouse
function GetSoilMoisture(call, callback) {
    if (!isAuthorized(call, callback)) return;

    const { greenhouseId } = call.request;
    const g = greenhouses[greenhouseId];

    if (!g) {
        log(`GetSoilMoisture failed – greenhouse ${greenhouseId} not found`);
        return callback({ code: 5, message: `Greenhouse ${greenhouseId} not found` });
    }

    log(`GetSoilMoisture called for ${greenhouseId}`);
    callback(null, { moistureLevel: g.moistureLevel });
}

// Unary: Get soil moisture for ALL greenhouses
function GetAllSoilMoisture(call, callback) {
    if (!isAuthorized(call, callback)) return;

    log(`GetAllSoilMoisture called`);
    const data = Object.entries(greenhouses).map(([id, g]) => ({
        greenhouseId: id,
        name: g.name,
        soilMoisture: g.moistureLevel,
        isIrrigating: g.isIrrigating
    }));

    callback(null, { greenhouses: data });
}

// Server Streaming: Stream live soil moisture data
function StreamSoilMoisture(call) {
    const key = call.metadata.get('api-key')[0];
    if (key !== VALID_API_KEY) {
        log("Unauthorized stream access attempt on StreamSoilMoisture");
        call.destroy();
        return;
    }

    log("StreamSoilMoisture started");

    const interval = setInterval(() => {
        Object.entries(greenhouses).forEach(([id, g]) => {
            call.write({
                greenhouseId: id,
                name: g.name,
                soilMoisture: parseFloat(g.moistureLevel.toFixed(1)),
                isIrrigating: g.isIrrigating,
                timestamp: new Date().toISOString()
            });
        });
    }, 5000);

    call.on('cancelled', () => {
        clearInterval(interval);
        log("StreamSoilMoisture cancelled by client");
    });

    call.on('end', () => {
        clearInterval(interval);
        call.end();
        log("StreamSoilMoisture ended");
    });
}

// Unary: Start irrigation
function StartIrrigation(call, callback) {
    if (!isAuthorized(call, callback)) return;

    const { greenhouseId } = call.request;
    const g = greenhouses[greenhouseId];

    if (!g) {
        log(`StartIrrigation failed – greenhouse ${greenhouseId} not found`);
        return callback({ code: 5, message: `Greenhouse ${greenhouseId} not found` });
    }

    if (g.isIrrigating) {
        log(`StartIrrigation ignored – already running for ${greenhouseId}`);
        return callback(null, { status: "Irrigation already running" });
    }

    g.isIrrigating = true;
    log(`Irrigation started for ${greenhouseId}`);
    callback(null, { status: `Irrigation started for ${g.name}` });
}

// Unary: Stop irrigation
function StopIrrigation(call, callback) {
    if (!isAuthorized(call, callback)) return;

    const { greenhouseId } = call.request;
    const g = greenhouses[greenhouseId];

    if (!g) {
        log(`StopIrrigation failed – greenhouse ${greenhouseId} not found`);
        return callback({ code: 5, message: `Greenhouse ${greenhouseId} not found` });
    }

    if (!g.isIrrigating) {
        log(`StopIrrigation ignored – already stopped for ${greenhouseId}`);
        return callback(null, { status: "Irrigation already stopped" });
    }

    g.isIrrigating = false;
    log(`Irrigation stopped for ${greenhouseId}`);
    callback(null, { status: `Irrigation stopped for ${g.name}` });
}

// Unary: Get water usage
function GetWaterUsage(call, callback) {
    if (!isAuthorized(call, callback)) return;

    const { greenhouseId } = call.request;
    const g = greenhouses[greenhouseId];

    if (!g) {
        log(`GetWaterUsage failed – greenhouse ${greenhouseId} not found`);
        return callback({ code: 5, message: `Greenhouse ${greenhouseId} not found` });
    }

    log(`GetWaterUsage called for ${greenhouseId}`);
    callback(null, { litresUsed: g.litresUsed });
}

// Client Streaming: Activate irrigation for multiple greenhouses
function ActivateIrrigation(call, callback) {
    const key = call.metadata.get('api-key')[0];
    if (key !== VALID_API_KEY) {
        log("Unauthorized stream attempt on ActivateIrrigation");
        call.destroy();
        return;
    }

    log("ActivateIrrigation stream started");

    let activated = [];
    let totalWaterProjected = 0;

    call.on('data', (command) => {
        const g = greenhouses[command.greenhouseId];
        if (g && !g.isIrrigating) {
            g.isIrrigating = true;
            activated.push(command.greenhouseId);
            totalWaterProjected += 20.0;
            log(`ActivateIrrigation: ${command.greenhouseId} activated`);
        }
    });

    call.on('end', () => {
        log(`ActivateIrrigation completed – ${activated.length} greenhouses`);
        callback(null, {
            activatedGreenhouses: activated,
            totalWaterProjected
        });
    });
}

// Export all handlers
module.exports = {
    GetSoilMoisture,
    GetAllSoilMoisture,
    StartIrrigation,
    StopIrrigation,
    GetWaterUsage,
    ActivateIrrigation,
    StreamSoilMoisture
};