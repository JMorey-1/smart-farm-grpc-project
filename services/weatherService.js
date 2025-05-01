// Weather service logic 

const VALID_API_KEY = "farmkey123";

// Check the API key from metadata
function isAuthorized(call) {
  const key = call.metadata.get('api-key')[0];
  return key === VALID_API_KEY;
}

// Handles GetWeather gRPC requests
function GetWeather(call, callback) {
    if (!isAuthorized(call)) {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: 'Unauthorized: Invalid API key'
      });
    }
  
    const baseData = {
      temperature: 11.0,
      humidity: 55.0,
      rainfall: 4.6
    };
  
    const variation = (base) => parseFloat((base + (Math.random() * 2 - 1)).toFixed(1));
    const conditions = ["Sunny", "Cloudy", "Rainy", "Stormy"];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const windspeed = parseFloat((Math.random() * 20).toFixed(1));
  
    const weatherData = {
      temperature: variation(baseData.temperature),
      humidity: variation(baseData.humidity),
      rainfall: variation(baseData.rainfall),
      windspeed: windspeed,
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