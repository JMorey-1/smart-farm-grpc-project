require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Import service implementations
const weatherService = require('./services/weatherService');
const irrigationService = require('./services/irrigationService');
const robotService = require('./services/robotService');

// Load the proto files
const weatherProtoPath = path.join(__dirname, 'proto', 'weather.proto');
const irrigationProtoPath = path.join(__dirname, 'proto', 'irrigation.proto');
const robotProtoPath = path.join(__dirname, 'proto', 'robot.proto');

const weatherPackageDef = protoLoader.loadSync(weatherProtoPath, {});
const irrigationPackageDef = protoLoader.loadSync(irrigationProtoPath, {});
const robotPackageDef = protoLoader.loadSync(robotProtoPath, {});

const weatherProto = grpc.loadPackageDefinition(weatherPackageDef).weather;
const irrigationProto = grpc.loadPackageDefinition(irrigationPackageDef).irrigation;
const robotProto = grpc.loadPackageDefinition(robotPackageDef).robot;

// Create the gRPC server
const server = new grpc.Server();

// Register services
server.addService(weatherProto.WeatherService.service, weatherService);
server.addService(irrigationProto.IrrigationService.service, irrigationService);
server.addService(robotProto.RobotService.service, robotService);

// Server address
const address = '0.0.0.0:50051';

// Bind and start the server
server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
        console.error('Server binding failed: ' + error);
        return;
    }
    server.start(); 
    console.log('gRPC Server is running at ' + address);
});