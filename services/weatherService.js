// Weather service logic 

function GetWeather(call, callback) {
    
    // Dummy data for testing
    const weatherData = {
        temperature: 22.5,
        humidity: 65.2,
        rainfall: 0.3
    };
    callback(null, weatherData);
}

module.exports = {
    GetWeather
};