const taskSequence = ["Waiting", "Moving", "Picking", "Returning", "Charging"];
const greenhouses = ["Greenhouse 1", "Greenhouse 2", "Greenhouse 3"];

// Global robot state
const robotStates = {
    "Robot1": createInitialRobotState("Robot1"),
    "Robot2": createInitialRobotState("Robot2"),
    "Robot3": createInitialRobotState("Robot3")
};

function createInitialRobotState(id) {
    return {
        robotId: id,
        position: "Warehouse",
        currentTask: "Waiting",
        containerLoad: 0.0,
        batteryLevel: 100.0,
        taskIndex: 0,
        taskTimer: 0,
        active: false,
        paused: false,
        targetGreenhouse: pickRandomGreenhouse()
    };
}

function pickRandomGreenhouse() {
    return greenhouses[Math.floor(Math.random() * greenhouses.length)];
}

function RobotCommandStream(stream) {
    let robotId = null;
    let interval = null;

    stream.on('data', (commandMsg) => {
        const { robotId: id, command } = commandMsg;
        if (!robotStates[id]) {
            stream.write({
                robotId: id,
                currentTask: "Error: Unknown robot",
                position: "",
                containerLoadPercent: 0,
                batteryLevelPercent: 0,
                timestamp: new Date().toISOString()
            });
            return;
        }

        const robot = robotStates[id];
        robotId = id;

        switch (command.toLowerCase()) {
            case "start":
                robot.active = true;
                robot.paused = false;
                robot.currentTask = "Moving";
                robot.taskIndex = 1;
                robot.taskTimer = 0;
                break;
            case "pause":
                robot.paused = true;
                robot.currentTask = "Paused";
                break;
            case "resume":
                if (robot.active && robot.paused) {
                    robot.paused = false;
                    robot.currentTask = taskSequence[robot.taskIndex] || "Idle";
                }
                break;
            case "return":
                robot.currentTask = "Returning";
                robot.taskIndex = 3;
                robot.taskTimer = 0;
                break;
            default:
                console.warn(`Unknown command '${command}' for ${id}`);
                break;
        }

        // Send status immediately after receiving a command
        sendStatus(robot, stream);

        // Start the status update loop
        if (!interval) {
            interval = setInterval(() => updateAndSendStatus(robot, stream), 5000);
        }
    });

    stream.on('end', () => {
        if (interval) clearInterval(interval);
        stream.end();
        console.log(`Robot stream ended for ${robotId}`);
    });

    stream.on('error', (err) => {
        if (interval) clearInterval(interval);
        console.error(`Robot stream error for ${robotId}:`, err.message);
    });
}

function updateAndSendStatus(robot, stream) {
    if (!robot.active || robot.paused) {
        sendStatus(robot, stream);
        return;
    }

    switch (robot.currentTask) {
        case "Moving":
            robot.position = robot.targetGreenhouse;
            robot.batteryLevel = Math.max(0, robot.batteryLevel - (Math.random() * 0.3 + 0.2));
            robot.taskTimer++;
            if (robot.taskTimer >= 2) {
                robot.currentTask = "Picking";
                robot.taskIndex = 2;
                robot.taskTimer = 0;
            }
            break;

        case "Picking":
            robot.containerLoad = Math.min(100, robot.containerLoad + (Math.random() * 8 + 2));
            robot.batteryLevel = Math.max(0, robot.batteryLevel - (Math.random() * 0.5 + 0.3));
            robot.taskTimer++;
            if (robot.containerLoad >= 95 || robot.taskTimer >= 5) {
                robot.currentTask = "Returning";
                robot.taskIndex = 3;
                robot.taskTimer = 0;
            }
            break;

        case "Returning":
            robot.position = "Warehouse";
            robot.batteryLevel = Math.max(0, robot.batteryLevel - (Math.random() * 0.4 + 0.2));
            robot.taskTimer++;
            if (robot.taskTimer >= 2) {
                robot.currentTask = "Charging";
                robot.taskIndex = 4;
                robot.taskTimer = 0;
            }
            break;

        case "Charging":
            robot.position = "Charging Station";
            robot.batteryLevel = Math.min(100, robot.batteryLevel + (Math.random() * 4 + 3));
            if (robot.batteryLevel >= 100) {
                robot.containerLoad = 0;
                robot.taskTimer = 0;
                robot.targetGreenhouse = pickRandomGreenhouse();
                robot.currentTask = "Moving";
                robot.taskIndex = 1;
            }
            break;
    }

    sendStatus(robot, stream);
}

function sendStatus(robot, stream) {
    stream.write({
        robotId: robot.robotId,
        position: robot.position,
        currentTask: robot.currentTask,
        containerLoadPercent: parseFloat(robot.containerLoad.toFixed(1)),
        batteryLevelPercent: parseFloat(robot.batteryLevel.toFixed(1)),
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    RobotCommandStream,
    robotStates
};
