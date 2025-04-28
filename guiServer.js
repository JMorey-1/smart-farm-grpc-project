// guiServer.js

const express = require('express');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const app = express();
const PORT = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'gui', 'views'));

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'gui', 'public')));

// ------------- Load gRPC Clients ------------- //

// WeatherService
const weatherProtoPath = path.join(__dirname, 'proto', 'weather.proto');
const weatherPackageDef = protoLoader.loadSync(weatherProtoPath, {});
const weatherProto = grpc.loadPackageDefinition(weatherPackageDef).weather;
const weatherClient = new weatherProto.WeatherService('localhost:50051', grpc.credentials.createInsecure());

// IrrigationService
const irrigationProtoPath = path.join(__dirname, 'proto', 'irrigation.proto');
const irrigationPackageDef = protoLoader.loadSync(irrigationProtoPath, {});
const irrigationProto = grpc.loadPackageDefinition(irrigationPackageDef).irrigation;
const irrigationClient = new irrigationProto.IrrigationService('localhost:50051', grpc.credentials.createInsecure());

// RobotService
const robotProtoPath = path.join(__dirname, 'proto', 'robot.proto');
const robotPackageDef = protoLoader.loadSync(robotProtoPath, {});
const robotProto = grpc.loadPackageDefinition(robotPackageDef).robot;
const robotClient = new robotProto.RobotService('localhost:50051', grpc.credentials.createInsecure());

// ------------- Routes ------------- //

// Home/Dashboard Route
app.get('/', (req, res) => {
    weatherClient.GetWeather({ location: 'Farm' }, (weatherError, weatherResponse) => {
        if (weatherError) {
            console.error('Weather error:', weatherError);
            weatherResponse = null;
        }

        irrigationClient.GetAllSoilMoisture({}, (soilError, soilResponse) => {
            if (soilError) {
                console.error('Soil error:', soilError);
                soilResponse = null;
            }

            res.render('index', {
                weatherData: weatherResponse,
                soilMoistureData: soilResponse ? soilResponse.greenhouses : [],
                robotData: [] // Placeholder for now
            });
        });
    });
});

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/start-irrigation', (req, res) => {
    const { greenhouseId } = req.body;

    irrigationClient.StartIrrigation({ greenhouseId }, (error, response) => {
        if (error) {
            console.error('Error starting irrigation:', error);
        } else {
            console.log(`Irrigation started for ${greenhouseId}: ${response.status}`);
        }
        res.redirect('/');
    });
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`GUI Server running at http://localhost:${PORT}`);
});