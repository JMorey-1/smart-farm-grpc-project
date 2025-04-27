const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Loading just the WeatherService proto for now
const weatherProtoPath = path.join(__dirname, 'proto', 'weather.proto');

const weatherPackageDef = protoLoader.loadSync(weatherProtoPath, {});
const weatherProto = grpc.loadPackageDefinition(weatherPackageDef).weather;

// Creating a client for the WeatherService
const client = new weatherProto.WeatherService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// Calling GetWeather
client.GetWeather({ location: 'Farm1' }, (error, response) => {
    if (error) {
        console.error('Error calling GetWeather:', error);
    } else {
        console.log('Weather data received:');
        console.log(response);
    }
});