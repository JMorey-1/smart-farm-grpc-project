// Weather service logic 

// Handles GetWeather gRPC requests
function GetWeather(call, callback) {
    
    // Base weather data
    const baseData = {
        temperature: 21.0,
        humidity: 55.0,
        rainfall: 4.6
    };

    // Function to create slight random variation (+/-1)
    const variation = (base) => parseFloat((base + (Math.random() * 2 - 1)).toFixed(1));

    // List of possible weather conditions
    const conditions = ["Sunny", "Cloudy", "Rainy", "Stormy"];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const windspeed = parseFloat((Math.random() * 20).toFixed(1));

    // Build the weather response
    const weatherData = {
        temperature: variation(baseData.temperature),
        humidity: variation(baseData.humidity),
        rainfall: variation(baseData.rainfall),
        windspeed: windspeed,
        condition: randomCondition,
        reportTime: new Date().toISOString() // Current time in ISO format
    };

    // Add an alert if heavy rainfall detected
    if (weatherData.rainfall > 5) {
        weatherData.alert = "Heavy Rain Warning!";
    } else {
        weatherData.alert = "";
    }

    // Send the response back to the client
    callback(null, weatherData);
}

// Export the service functions
module.exports = {
    GetWeather
};