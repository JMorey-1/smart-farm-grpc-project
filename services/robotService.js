// Robot service logic 

function StreamRobotStatus(call) {
    const { robotId } = call.request;

    // Simulated robots (could expand later if you want)
    const robots = {
        "Robot1": { position: "Greenhouse 1", currentTask: "Picking", containerLoad: 25.0, batteryLevel: 90.0 },
        "Robot2": { position: "Greenhouse 2", currentTask: "Transporting", containerLoad: 40.0, batteryLevel: 85.0 }
    };

    // Choose the requested robot, or default to Robot1
    const selectedRobotId = robotId || "Robot1";
    let robot = robots[selectedRobotId];

    if (!robot) {
        call.emit('error', {
            code: 5, // NOT_FOUND
            message: `Robot ${selectedRobotId} not found`
        });
        return;
    }

    console.log(`Streaming status for ${selectedRobotId}...`);

    // Helper to randomly adjust values
    function randomVariation(value, minChange, maxChange, minLimit, maxLimit) {
        const variation = (Math.random() * (maxChange - minChange)) + minChange;
        let newValue = value + variation;
        return Math.min(maxLimit, Math.max(minLimit, parseFloat(newValue.toFixed(1))));
    }

    const positions = ["Greenhouse 1", "Greenhouse 2", "Warehouse", "Charging Station"];
    const tasks = ["Picking", "Transporting", "Idle", "Charging"];

    const interval = setInterval(() => {
        // Simulate random movement and status changes
        robot.position = positions[Math.floor(Math.random() * positions.length)];
        robot.currentTask = tasks[Math.floor(Math.random() * tasks.length)];
        robot.containerLoad = randomVariation(robot.containerLoad, -5, 10, 0, 100);
        robot.batteryLevel = randomVariation(robot.batteryLevel, -2, -0.5, 0, 100);

        const update = {
            robotId: selectedRobotId,
            position: robot.position,
            currentTask: robot.currentTask,
            containerLoadPercent: robot.containerLoad,
            batteryLevelPercent: robot.batteryLevel,
            timestamp: new Date().toISOString()
        };

        call.write(update);
    }, 3000); // every 3 seconds

    // Handle client cancelling the stream
    call.on('cancelled', () => {
        console.log(`Client cancelled robot streaming for ${selectedRobotId}`);
        clearInterval(interval);
    });

    call.on('end', () => {
        console.log(`Client ended robot streaming for ${selectedRobotId}`);
        clearInterval(interval);
        call.end();
    });
}

module.exports = {
    StreamRobotStatus
};