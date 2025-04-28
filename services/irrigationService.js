// Irrigation service logic 

// Simulated Greenhouse Data
const greenhouses = {
    "Greenhouse 1": { name: "Tomato House", moistureLevel: 42.5, litresUsed: 120.0, isIrrigating: false },
    "Greenhouse 2": { name: "Strawberry House", moistureLevel: 38.0, litresUsed: 95.0, isIrrigating: false },
    "Greenhouse 3": { name: "Herb Garden", moistureLevel: 55.0, litresUsed: 80.0, isIrrigating: false }
};

// Get soil moisture for a single greenhouse
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

// Get soil moisture for ALL greenhouses
function GetAllSoilMoisture(call, callback) {
    const allStatuses = Object.keys(greenhouses).map(id => ({
        greenhouseId: id,
        name: greenhouses[id].name,
        soilMoisture: greenhouses[id].moistureLevel,
        isIrrigating: greenhouses[id].isIrrigating
    }));

    callback(null, { greenhouses: allStatuses });
}

// Start irrigation for a single greenhouse
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
    callback(null, { status: `Irrigation started for ${greenhouse.name}` });
}

// Stop irrigation for a single greenhouse
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
    callback(null, { status: `Irrigation stopped for ${greenhouse.name}` });
}

// Get total water usage for a greenhouse
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

// Activate Irrigation for multiple greenhouses (Client Streaming)
function ActivateIrrigation(call, callback) {
    let activated = [];
    let totalWaterProjected = 0;

    call.on('data', (command) => {
        const { greenhouseId } = command;
        const greenhouse = greenhouses[greenhouseId];

        if (greenhouse) {
            if (!greenhouse.isIrrigating) {
                greenhouse.isIrrigating = true;
                activated.push(greenhouseId);
                totalWaterProjected += 20.0; // Assume 20 litres projected per irrigation
            }
        }
    });

    call.on('end', () => {
        callback(null, {
            activatedGreenhouses: activated,
            totalWaterProjected: totalWaterProjected
        });
    });
}

module.exports = {
    GetSoilMoisture,
    GetAllSoilMoisture,
    StartIrrigation,
    StopIrrigation,
    GetWaterUsage,
    ActivateIrrigation
};