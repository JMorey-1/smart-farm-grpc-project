const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the WeatherService proto
const weatherProtoPath = path.join(__dirname, 'proto', 'weather.proto');
const weatherPackageDef = protoLoader.loadSync(weatherProtoPath, {});
const weatherProto = grpc.loadPackageDefinition(weatherPackageDef).weather;

// Create a client
const client = new weatherProto.WeatherService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// Call GetWeather
client.GetWeather({ location: 'Farm' }, (error, response) => {
    if (error) {
        console.error('Error calling GetWeather:', error);
    } else {
        console.log('--- Weather Report ---');
        console.log(`Temperature: ${response.temperature.toFixed(1)} °C`);
        console.log(`Humidity: ${response.humidity.toFixed(1)} %`);
        console.log(`Rainfall: ${response.rainfall.toFixed(1)} mm`);
        console.log(`Condition: ${response.condition}`);

        // Only display alert if it's not empty
        if (response.alert && response.alert.trim() !== '') {
            console.log(`ALERT: ${response.alert}`);
        }

        // Formatting the time so its a bit more readable
        const reportDate = new Date(response.reportTime);
        const formattedDate = `${reportDate.getDate().toString().padStart(2, '0')}/${(reportDate.getMonth()+1).toString().padStart(2, '0')}/${reportDate.getFullYear()} ${reportDate.getHours().toString().padStart(2, '0')}:${reportDate.getMinutes().toString().padStart(2, '0')}`;

        console.log(`Report Time: ${formattedDate}`);
        console.log('-----------------------\n');
    }
});