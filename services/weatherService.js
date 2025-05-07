// Weather service logic

// Import my new log function
const { log } = require('../logger'); 

const VALID_API_KEY = "farmkey123";

// Check the API key from the metadata
function isAuthorized(call) {
  const key = call.metadata.get('api-key')[0];
  if (key !== VALID_API_KEY) {
    log("Unauthorized request to GetWeather");
    return false;
  }
  return true;
}

// Handles GetWeather gRPC requests
function GetWeather(call, callback) {
  if (!isAuthorized(call)) {
    return callback({
      code: 7, // 7 = Permission Denied
      message: 'Unauthorized: Invalid API key'
    });
  }

  log("GetWeather called by client");

  // These are the base weather values
  const baseData = {
    temperature: 11.0, // °C
    humidity: 55.0,    // %
    rainfall: 4.6      // mm
  };

  // Add slight random variation to simulate change
  const variation = (base) => parseFloat((base + (Math.random() * 2 - 1)).toFixed(1));

  // Simulate a random weather condition
  const conditions = ["Sunny", "Cloudy", "Rainy", "Stormy"];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

  const windspeed = parseFloat((Math.random() * 20).toFixed(1)); // Random between 0–20

  const weatherData = {
    temperature: variation(baseData.temperature),
    humidity: variation(baseData.humidity),
    rainfall: variation(baseData.rainfall),
    windspeed,
    condition: randomCondition,
    reportTime: new Date().toISOString(),
    alert: variation(baseData.rainfall) > 5 ? "Heavy Rain Warning!" : ""
  };

  callback(null, weatherData);
}

// Export the service functions
module.exports = {
  GetWeather
};