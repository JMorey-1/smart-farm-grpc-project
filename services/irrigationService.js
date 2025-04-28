// Irrigation service logic 

// Simulated Greenhouse Data
const greenhouses = {
    "Greenhouse 1": { moistureLevel: 35.0, litresUsed: 120.0, isIrrigating: false },
    "Greenhouse 2": { moistureLevel: 40.5, litresUsed: 100.0, isIrrigating: false },
    "Greenhouse 3": { moistureLevel: 28.0, litresUsed: 140.0, isIrrigating: false }
};

// Get soil moisture level
function GetSoilMoisture(call, callback) {
    const { greenhouseId } = call.request;
    const greenhouse = greenhouses[greenhouseId];

    if (!greenhouse) {
        return callback({
            code: 5, // NOT_FOUND
            message: `Greenhouse ${greenhouseId} not found`
        });
    }

    callback(null, { moistureLevel: greenhouse.moistureLevel });
}

// Start irrigation
function StartIrrigation(call, callback) {
    const { greenhouseId } = call.request;
    const greenhouse = greenhouses[greenhouseId];

    if (!greenhouse) {
        return callback({
            code: 5,
            message: `Greenhouse ${greenhouseId} not found`
        });
    }

    if (greenhouse.isIrrigating) {
        return callback(null, { status: "Irrigation already running" });
    }

    greenhouse.isIrrigating = true;
    callback(null, { status: "Irrigation started" });
}

// Stop irrigation
function StopIrrigation(call, callback) {
    const { greenhouseId } = call.request;
    const greenhouse = greenhouses[greenhouseId];

    if (!greenhouse) {
        return callback({
            code: 5,
            message: `Greenhouse ${greenhouseId} not found`
        });
    }

    if (!greenhouse.isIrrigating) {
        return callback(null, { status: "Irrigation already stopped" });
    }

    greenhouse.isIrrigating = false;
    callback(null, { status: "Irrigation stopped" });
}

// Get water usage
function GetWaterUsage(call, callback) {
    const { greenhouseId } = call.request;
    const greenhouse = greenhouses[greenhouseId];

    if (!greenhouse) {
        return callback({
            code: 5,
            message: `Greenhouse ${greenhouseId} not found`
        });
    }

    callback(null, { litresUsed: greenhouse.litresUsed });
}

module.exports = {
    GetSoilMoisture,
    StartIrrigation,
    StopIrrigation,
    GetWaterUsage
};