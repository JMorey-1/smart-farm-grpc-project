const express = require('express');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const bodyParser = require('body-parser');

const { robotStates } = require('./services/robotService');

const app = express();
const PORT = 3000;

// View engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'gui', 'views'));
app.use(express.static(path.join(__dirname, 'gui', 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// gRPC client setup
const loadProto = (filename) =>
  grpc.loadPackageDefinition(protoLoader.loadSync(path.join(__dirname, 'proto', filename), {}));

const weatherProto = loadProto('weather.proto').weather;
const irrigationProto = loadProto('irrigation.proto').irrigation;
const robotProto = loadProto('robot.proto').robot;

const weatherClient = new weatherProto.WeatherService('localhost:50051', grpc.credentials.createInsecure());
const irrigationClient = new irrigationProto.IrrigationService('localhost:50051', grpc.credentials.createInsecure());
const robotClient = new robotProto.RobotService('localhost:50051', grpc.credentials.createInsecure());

// Active robot streams
const activeRobotStreams = {};

// Routes
app.get('/', (req, res) => {
  weatherClient.GetWeather({ location: 'Farm' }, (weatherErr, weatherRes) => {
    if (weatherErr) {
      console.error('Weather error:', weatherErr);
      weatherRes = null;
    }

    irrigationClient.GetAllSoilMoisture({}, (soilErr, soilRes) => {
      if (soilErr) {
        console.error('Soil error:', soilErr);
        soilRes = null;
      }

      res.render('index', {
        weatherData: weatherRes
          ? { ...weatherRes, reportTimeFormatted: new Date(weatherRes.reportTime).toLocaleString() }
          : null,
        soilMoistureData: soilRes ? soilRes.greenhouses : [],
        robotData: []
      });
    });
  });
});

app.get('/system-status', (_, res) => res.status(200).send("OK"));

// Irrigation commands
app.post('/start-irrigation', (req, res) => {
  const { greenhouseId } = req.body;
  irrigationClient.StartIrrigation({ greenhouseId }, (err, response) => {
    if (err) return res.status(500).send("Failed to start irrigation");
    res.send(response.status);
  });
});

app.post('/stop-irrigation', (req, res) => {
  const { greenhouseId } = req.body;
  irrigationClient.StopIrrigation({ greenhouseId }, (err, response) => {
    if (err) return res.status(500).send("Failed to stop irrigation");
    res.send(response.status);
  });
});

// SSE for soil moisture
app.get('/soil-moisture-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    irrigationClient.GetAllSoilMoisture({}, (err, soilRes) => {
      if (err) return;
      soilRes.greenhouses.forEach(g => {
        res.write(`data: ${JSON.stringify(g)}\n\n`);
      });
    });
  }, 5000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

app.get('/robot-control-stream', (req, res) => {
    const { robotId } = req.query;
  
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  
    const stream = robotClient.RobotCommandStream();
    activeRobotStreams[robotId] = stream;
  
    // Send current 'Waiting' state immediately without changing logic
    const initial = robotStates[robotId];
    if (initial) {
      const initialStatus = {
        robotId: initial.robotId,
        position: initial.position,
        currentTask: initial.currentTask,
        containerLoadPercent: parseFloat(initial.containerLoad.toFixed(1)),
        batteryLevelPercent: parseFloat(initial.batteryLevel.toFixed(1)),
        timestamp: new Date().toISOString()
      };
      res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);
    } else {
      console.warn(`No robot state found for ${robotId}`);
      res.write(`data: ${JSON.stringify({ error: "Unknown robot" })}\n\n`);
    }
  
    // Pipe updates from gRPC stream to client
    stream.on('data', (robotStatus) => {
      res.write(`data: ${JSON.stringify(robotStatus)}\n\n`);
    });
  
    stream.on('error', (err) => {
      console.error(`Robot stream error for ${robotId}:`, err.message);
      res.end();
    });
  
    stream.on('end', () => {
      console.log(`Robot stream ended for ${robotId}`);
      res.end();
    });
  
    req.on('close', () => {
      console.log(`Client closed stream for ${robotId}`);
      if (activeRobotStreams[robotId]) delete activeRobotStreams[robotId];
      stream.end();
      res.end();
    });
  });

// Route to send robot command (Start, Pause, Resume, Return)
app.post('/send-robot-command', (req, res) => {
    const { robotId, command } = req.body;

    const lowerCommand = command.toLowerCase();

    const stream = activeRobotStreams[robotId];
  
    if (stream) {
      stream.write({ robotId, command: lowerCommand }); // Use lowerCommand here instead of command
      console.log(`Command sent to ${robotId}: ${lowerCommand}`);
      res.status(200).send("Command sent");
    } else {
      console.warn(`No active stream for ${robotId}`);
      res.status(404).send("No active stream");
    }
})

// Start server
app.listen(PORT, () => {
  console.log(`GUI Server running at http://localhost:${PORT}`);
});