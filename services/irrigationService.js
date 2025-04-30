// services/irrigationService.js

// Simulated Greenhouse Data
const greenhouses = {
    "Greenhouse 1": { name: "Tomato House", moistureLevel: 42.5, litresUsed: 120.0, isIrrigating: false },
    "Greenhouse 2": { name: "Strawberry House", moistureLevel: 38.0, litresUsed: 95.0, isIrrigating: false },
    "Greenhouse 3": { name: "Herb Garden", moistureLevel: 55.0, litresUsed: 80.0, isIrrigating: false }
};

// Moisture simulation: every 5 seconds, update irrigating greenhouses
setInterval(() => {
    Object.keys(greenhouses).forEach(id => {
        const greenhouse = greenhouses[id];
        if (greenhouse.isIrrigating) {
            greenhouse.moistureLevel = Math.min(100, greenhouse.moistureLevel + (Math.random() * 1.5 + 0.5)); // +0.5 to +2.0%
            greenhouse.litresUsed += Math.random() * 5 + 2; // +2 to +7 litres
        }
    });
}, 5000);

// Unary: Get soil moisture for a single greenhouse
function GetSoilMoisture(call, callback) {
    const { greenhouseId } = call.request;
    const greenhouse = greenhouses[greenhouseId];

    if (!greenhouse) {
        return callback({
            code: 5,
            message: `Greenhouse ${greenhouseId} not found`
        });
    }

    callback(null, { moistureLevel: greenhouse.moistureLevel });
}

// Unary: Get soil moisture for ALL greenhouses
function GetAllSoilMoisture(call, callback) {
    const allStatuses = Object.keys(greenhouses).map(id => ({
        greenhouseId: id,
        name: greenhouses[id].name,
        soilMoisture: greenhouses[id].moistureLevel,
        isIrrigating: greenhouses[id].isIrrigating
    }));

    callback(null, { greenhouses: allStatuses });
}

// 🔁 Server Streaming: Stream live soil moisture data
function StreamSoilMoisture(call) {
    const interval = setInterval(() => {
        Object.entries(greenhouses).forEach(([id, g]) => {
            const status = {
                greenhouseId: id,
                name: g.name,
                soilMoisture: parseFloat(g.moistureLevel.toFixed(1)),
                isIrrigating: g.isIrrigating,
                timestamp: new Date().toISOString()
            };
            call.write(status);
        });
    }, 5000); // Stream every 5 seconds

    call.on('cancelled', () => clearInterval(interval));
    call.on('end', () => {
        clearInterval(interval);
        call.end();
    });
}

// Unary: Start irrigation
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

// Unary: Stop irrigation
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

// Unary: Get water usage
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

// Client Streaming: Activate irrigation for multiple greenhouses
function ActivateIrrigation(call, callback) {
    let activated = [];
    let totalWaterProjected = 0;

    call.on('data', (command) => {
        const { greenhouseId } = command;
        const greenhouse = greenhouses[greenhouseId];

        if (greenhouse && !greenhouse.isIrrigating) {
            greenhouse.isIrrigating = true;
            activated.push(greenhouseId);
            totalWaterProjected += 20.0;
        }
    });

    call.on('end', () => {
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