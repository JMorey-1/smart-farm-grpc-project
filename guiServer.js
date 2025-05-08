const express = require('express');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const bodyParser = require('body-parser');

const { robotStates } = require('./services/robotService');

// Load service addresses
const registry = require('./serviceRegistry.json');

const app = express();
const PORT = 3000;

// API Key metadata for secured services
const apiMetadata = new grpc.Metadata();
apiMetadata.add('api-key', 'farmkey123');

// Set up the view engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'gui', 'views'));
app.use(express.static(path.join(__dirname, 'gui', 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// Load proto definitions
const loadProto = (filename) =>
  grpc.loadPackageDefinition(protoLoader.loadSync(path.join(__dirname, 'proto', filename), {}));

// Load each service from its proto
const weatherProto = loadProto('weather.proto').weather;
const irrigationProto = loadProto('irrigation.proto').irrigation;
const robotProto = loadProto('robot.proto').robot;

// Create gRPC clients using the service registry
const weatherClient = new weatherProto.WeatherService(registry.WeatherService, grpc.credentials.createInsecure());
const irrigationClient = new irrigationProto.IrrigationService(registry.IrrigationService, grpc.credentials.createInsecure());
const robotClient = new robotProto.RobotService(registry.RobotService, grpc.credentials.createInsecure());

// Keep track of active robot streams
const activeRobotStreams = {};

// Home route: fetch weather and soil data and pass to dashboard
app.get('/', (req, res) => {
  weatherClient.GetWeather({ location: 'Farm' }, apiMetadata, (weatherErr, weatherRes) => {
    if (weatherErr) {
      console.error('Weather error:', weatherErr);
      weatherRes = null;
    }

    irrigationClient.GetAllSoilMoisture({}, apiMetadata, async (soilErr, soilRes) => {
      if (soilErr) {
        console.error('Soil error:', soilErr);
        soilRes = null;
      }

      // Add water usage for each greenhouse
      const soilMoistureData = [];

      if (soilRes && soilRes.greenhouses) {
        for (const g of soilRes.greenhouses) {
          await new Promise(resolve => {
            irrigationClient.GetWaterUsage({ greenhouseId: g.greenhouseId }, apiMetadata, (usageErr, usageRes) => {
              if (usageErr) {
                console.error(`Water usage error for ${g.greenhouseId}:`, usageErr.message);
                g.litresUsed = null;
              } else {
                g.litresUsed = usageRes.litresUsed;
              }
              soilMoistureData.push(g);
              resolve();
            });
          });
        }
      }

      res.render('index', {
        weatherData: weatherRes
          ? { ...weatherRes, reportTimeFormatted: new Date(weatherRes.reportTime).toLocaleString() }
          : null,
        soilMoistureData,
        robotData: []
      });
    });
  });
});

// Simple system status check (used in my footer)
app.get('/system-status', (_, res) => res.status(200).send("OK"));

// Start irrigation for a greenhouse
app.post('/start-irrigation', (req, res) => {
  const { greenhouseId } = req.body;
  irrigationClient.StartIrrigation({ greenhouseId }, apiMetadata, (err, response) => {
    if (err) return res.status(500).send("Failed to start irrigation");
    res.send(response.status);
  });
});

// Stop irrigation for a greenhouse
app.post('/stop-irrigation', (req, res) => {
  const { greenhouseId } = req.body;
  irrigationClient.StopIrrigation({ greenhouseId }, apiMetadata, (err, response) => {
    if (err) return res.status(500).send("Failed to stop irrigation");
    res.send(response.status);
  });
});

app.post('/activate-all', (req, res) => {
  // Fetch all greenhouse IDs
  irrigationClient.GetAllSoilMoisture({}, apiMetadata, (err, allRes) => {
    if (err) {
      console.error('GetAllSoilMoisture error:', err.message);
      return res.status(500).send('Failed to retrieve greenhouses');
    }

    // Open the client‐stream for batch activation
    const stream = irrigationClient.ActivateIrrigation(apiMetadata, (err, activationRes) => {
      if (err) {
        console.error('ActivateIrrigation error:', err.message);
        return res.status(500).send('Activation failed');
      }
      // Send back the aggregated reply
      res.json(activationRes);
    });

    // Write each greenhouseId into the stream, then close
    allRes.greenhouses.forEach(g => {
      stream.write({ greenhouseId: g.greenhouseId });
    });
    stream.end();
  });
});

// Stream live soil moisture updates 
app.get('/soil-moisture-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = irrigationClient.StreamSoilMoisture({}, apiMetadata);

  stream.on('data', (update) => {
    // Send each soil moisture update to the browser
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  });

  stream.on('error', (err) => {
    console.error("Soil moisture stream error:", err.message);
    res.end();
  });

  stream.on('end', () => {
    console.log("Soil moisture stream ended");
    res.end();
  });

  req.on('close', () => {
    stream.cancel(); 
    res.end();
  });
});

// Stream live robot status updates and control them
app.get('/robot-control-stream', (req, res) => {
  const { robotId } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Include metadata when creating the stream
  const stream = robotClient.RobotCommandStream(apiMetadata);
  activeRobotStreams[robotId] = stream;

  // Send the current robot state right away
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

  // Forward each robot update to the frontend
  stream.on('data', (robotStatus) => {
    res.write(`data: ${JSON.stringify(robotStatus)}\n\n`);
  });

  // Handle any stream errors
  stream.on('error', (err) => {
    console.error(`Robot stream error for ${robotId}:`, err.message);
    res.end();
  });

  // Handle when the stream ends
  stream.on('end', () => {
    console.log(`Robot stream ended for ${robotId}`);
    res.end();
  });

  // Handle browser closing the connection
  req.on('close', () => {
    console.log(`Client closed stream for ${robotId}`);
    if (activeRobotStreams[robotId]) delete activeRobotStreams[robotId];
    stream.end();
    res.end();
  });
});

// Send commands to a robot (start, pause, resume, return)
app.post('/send-robot-command', (req, res) => {
  const { robotId, command } = req.body;
  const lowerCommand = command.toLowerCase();

  const stream = activeRobotStreams[robotId];

  if (stream) {
    stream.write({ robotId, command: lowerCommand });
    console.log(`Command sent to ${robotId}: ${lowerCommand}`);
    res.status(200).send("Command sent");
  } else {
    console.warn(`No active stream for ${robotId}`);
    res.status(404).send("No active stream");
  }
});

// Start the GUI server
app.listen(PORT, () => {
  console.log(`GUI Server running at http://localhost:${PORT}`);
});