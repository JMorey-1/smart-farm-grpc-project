const express = require('express');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// View engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'gui', 'views'));
app.use(express.static(path.join(__dirname, 'gui', 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json()); // For JSON POST

// ----- gRPC Clients -----
const weatherProtoPath = path.join(__dirname, 'proto', 'weather.proto');
const weatherPackageDef = protoLoader.loadSync(weatherProtoPath, {});
const weatherProto = grpc.loadPackageDefinition(weatherPackageDef).weather;
const weatherClient = new weatherProto.WeatherService('localhost:50051', grpc.credentials.createInsecure());

const irrigationProtoPath = path.join(__dirname, 'proto', 'irrigation.proto');
const irrigationPackageDef = protoLoader.loadSync(irrigationProtoPath, {});
const irrigationProto = grpc.loadPackageDefinition(irrigationPackageDef).irrigation;
const irrigationClient = new irrigationProto.IrrigationService('localhost:50051', grpc.credentials.createInsecure());

const robotProtoPath = path.join(__dirname, 'proto', 'robot.proto');
const robotPackageDef = protoLoader.loadSync(robotProtoPath, {});
const robotProto = grpc.loadPackageDefinition(robotPackageDef).robot;
const robotClient = new robotProto.RobotService('localhost:50051', grpc.credentials.createInsecure());

// Active robot streams (for commands)
const activeRobotStreams = {};

// ----- Routes -----

// Homepage
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
                weatherData: weatherResponse ? {
                    ...weatherResponse,
                    reportTimeFormatted: new Date(weatherResponse.reportTime).toLocaleString()
                } : null,
                soilMoistureData: soilResponse ? soilResponse.greenhouses : [],
                robotData: [] // handled live via streaming
            });
        });
    });
});

// Start irrigation
app.post('/start-irrigation', (req, res) => {
    const { greenhouseId } = req.body;

    irrigationClient.StartIrrigation({ greenhouseId }, (error, response) => {
        if (error) {
            console.error('Error starting irrigation:', error);
            return res.status(500).send("Failed to start irrigation");
        }

        console.log(`Irrigation started for ${greenhouseId}: ${response.status}`);
        res.send(response.status);
    });
});

// Stop irrigation
app.post('/stop-irrigation', (req, res) => {
    const { greenhouseId } = req.body;

    irrigationClient.StopIrrigation({ greenhouseId }, (error, response) => {
        if (error) {
            console.error('Error stopping irrigation:', error);
            return res.status(500).send("Failed to stop irrigation");
        }

        console.log(`Irrigation stopped for ${greenhouseId}: ${response.status}`);
        res.send(response.status);
    });
});

// ----- SSE Streaming Routes -----

// Soil moisture stream
app.get('/soil-moisture-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const interval = setInterval(() => {
        irrigationClient.GetAllSoilMoisture({}, (error, soilResponse) => {
            if (error) {
                console.error('Soil moisture stream error:', error);
                return;
            }

            soilResponse.greenhouses.forEach(g => {
                res.write(`data: ${JSON.stringify(g)}\n\n`);
            });
        });
    }, 5000);

    req.on('close', () => {
        clearInterval(interval);
        res.end();
    });
});

// Live robot status stream (non-interactive view only)
app.get('/robot-status-stream', (req, res) => {
    const { robotId } = req.query;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const call = robotClient.StreamRobotStatus({ robotId });

    call.on('data', (robotStatus) => {
        res.write(`data: ${JSON.stringify(robotStatus)}\n\n`);
    });

    call.on('error', (error) => {
        console.error('Robot streaming error:', error);
        res.end();
    });

    call.on('end', () => {
        console.log('Robot streaming ended by server.');
        res.end();
    });

    req.on('close', () => {
        console.log('Client closed robot status stream');
        call.cancel();
    });
});

// Bidirectional control + status stream
app.get('/robot-control-stream', (req, res) => {
    const { robotId } = req.query;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const call = robotClient.RobotCommandStream();
    activeRobotStreams[robotId] = call;

    // Start with default "Resume"
    call.write({ robotId, command: 'Resume' });

    call.on('data', (robotStatus) => {
        res.write(`data: ${JSON.stringify(robotStatus)}\n\n`);
    });

    call.on('error', (error) => {
        console.error('Robot command stream error:', error);
        res.end();
    });

    call.on('end', () => {
        console.log('Robot command stream ended by server.');
        res.end();
    });

    req.on('close', () => {
        console.log(`Client closed command stream for ${robotId}`);
        if (activeRobotStreams[robotId]) delete activeRobotStreams[robotId];
        call.end();
        res.end();
    });
});

// Handle command sent from frontend
app.post('/send-robot-command', (req, res) => {
    const { robotId, command } = req.body;
    const stream = activeRobotStreams[robotId];

    if (stream) {
        stream.write({ robotId, command });
        console.log(`Forwarded command to ${robotId}: ${command}`);
        res.sendStatus(200);
    } else {
        console.warn(`No active stream for ${robotId}`);
        res.status(404).send('No active stream for this robot');
    }
});

// ----- Start Server -----
app.listen(PORT, () => {
    console.log(`GUI Server running at http://localhost:${PORT}`);
});