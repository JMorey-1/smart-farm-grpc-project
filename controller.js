const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load WeatherService proto
const weatherProtoPath = path.join(__dirname, 'proto', 'weather.proto');
const weatherPackageDef = protoLoader.loadSync(weatherProtoPath, {});
const weatherProto = grpc.loadPackageDefinition(weatherPackageDef).weather;

// Load IrrigationService proto
const irrigationProtoPath = path.join(__dirname, 'proto', 'irrigation.proto');
const irrigationPackageDef = protoLoader.loadSync(irrigationProtoPath, {});
const irrigationProto = grpc.loadPackageDefinition(irrigationPackageDef).irrigation;

// Create WeatherService client
const weatherClient = new weatherProto.WeatherService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// Create IrrigationService client
const irrigationClient = new irrigationProto.IrrigationService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// ------------------ Testing Weather Service ------------------ //

function getWeather() {
    weatherClient.GetWeather({ location: 'Farm' }, (error, response) => {
        if (error) {
            console.error('Error calling GetWeather:', error);
        } else {
            console.log('--- Weather Report ---');
            console.log(`Temperature: ${response.temperature.toFixed(1)} °C`);
            console.log(`Humidity: ${response.humidity.toFixed(1)} %`);
            console.log(`Rainfall: ${response.rainfall.toFixed(1)} mm`);
            console.log(`Condition: ${response.condition}`);
            console.log(`Windspeed: ${response.windspeed.toFixed(1)} km/h`);
            if (response.alert && response.alert.trim() !== '') {
                console.log(`ALERT: ${response.alert}`);
            }
            const reportDate = new Date(response.reportTime);
            const formattedDate = `${reportDate.getDate().toString().padStart(2, '0')}/${(reportDate.getMonth()+1).toString().padStart(2, '0')}/${reportDate.getFullYear()} ${reportDate.getHours().toString().padStart(2, '0')}:${reportDate.getMinutes().toString().padStart(2, '0')}`;
            console.log(`Report Time: ${formattedDate}`);
            console.log('-----------------------\n');
        }
    });
}

// ------------------ Testing Irrigation Service ------------------ //

function getSoilMoisture(greenhouseId) {
    irrigationClient.GetSoilMoisture({ greenhouseId }, (error, response) => {
        if (error) {
            console.error('Error calling GetSoilMoisture:', error);
        } else {
            console.log(`Soil moisture in ${greenhouseId}: ${response.moistureLevel.toFixed(1)} %`);
        }
    });
}

function startIrrigation(greenhouseId) {
    irrigationClient.StartIrrigation({ greenhouseId }, (error, response) => {
        if (error) {
            console.error('Error calling StartIrrigation:', error);
        } else {
            console.log(`Start Irrigation response for ${greenhouseId}: ${response.status}`);
        }
    });
}

function stopIrrigation(greenhouseId) {
    irrigationClient.StopIrrigation({ greenhouseId }, (error, response) => {
        if (error) {
            console.error('Error calling StopIrrigation:', error);
        } else {
            console.log(`Stop Irrigation response for ${greenhouseId}: ${response.status}`);
        }
    });
}

function getWaterUsage(greenhouseId) {
    irrigationClient.GetWaterUsage({ greenhouseId }, (error, response) => {
        if (error) {
            console.error('Error calling GetWaterUsage:', error);
        } else {
            console.log(`Water used in ${greenhouseId}: ${response.litresUsed.toFixed(1)} litres`);
        }
    });
}

// ------------------ Example Calls ------------------ //

// Test Weather
getWeather();

// Test Irrigation
getSoilMoisture('Greenhouse 1');
startIrrigation('Greenhouse 1');
stopIrrigation('Greenhouse 1');
getWaterUsage('Greenhouse 1');
