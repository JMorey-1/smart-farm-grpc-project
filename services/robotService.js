// Robot service logic 

const taskSequence = ["Idle", "Moving", "Picking", "Returning", "Charging"];
const greenhouses = ["Greenhouse 1", "Greenhouse 2", "Greenhouse 3"];

function createInitialRobotState(id) {
    return {
        robotId: id,
        position: "Charging Station",
        currentTask: "Idle",
        containerLoad: 0.0,
        batteryLevel: 100.0,
        taskIndex: 0,
        targetGreenhouse: pickRandomGreenhouse()
    };
}

function pickRandomGreenhouse() {
    return greenhouses[Math.floor(Math.random() * greenhouses.length)];
}

const robotStates = {
    "Robot1": createInitialRobotState("Robot1"),
    "Robot2": createInitialRobotState("Robot2"),
    "Robot3": createInitialRobotState("Robot3")
};

function StreamRobotStatus(call) {
    const { robotId } = call.request;

    if (!robotStates[robotId]) {
        call.emit('error', {
            code: 5,
            message: `Robot ${robotId} not found`
        });
        return;
    }

    const robot = robotStates[robotId];

    console.log(`Streaming realistic status for ${robotId}...`);

    const interval = setInterval(() => {
        robot.currentTask = taskSequence[robot.taskIndex];

        switch (robot.currentTask) {
            case "Idle":
                robot.position = "Charging Station";
                robot.batteryLevel = Math.max(0, robot.batteryLevel - 0.1);
                break;

            case "Moving":
                robot.position = robot.targetGreenhouse;
                robot.batteryLevel = Math.max(0, robot.batteryLevel - (Math.random() * 0.5 + 0.3));
                break;

            case "Picking":
                robot.containerLoad = Math.min(100, robot.containerLoad + (Math.random() * 4 + 1));
                robot.batteryLevel = Math.max(0, robot.batteryLevel - (Math.random() * 0.5 + 0.4));
                break;

            case "Returning":
                robot.position = "Warehouse";
                robot.batteryLevel = Math.max(0, robot.batteryLevel - (Math.random() * 0.5 + 0.3));
                break;

            case "Charging":
                robot.position = "Charging Station";
                robot.batteryLevel = Math.min(100, robot.batteryLevel + (Math.random() * 3 + 2));

                if (robot.batteryLevel >= 100) {
                    robot.containerLoad = 0;
                    robot.targetGreenhouse = pickRandomGreenhouse();
                    robot.taskIndex = -1; // so next is 0 (Idle)
                }
                break;
        }

        const update = {
            robotId: robot.robotId,
            position: robot.position,
            currentTask: robot.currentTask,
            containerLoadPercent: parseFloat(robot.containerLoad.toFixed(1)),
            batteryLevelPercent: parseFloat(robot.batteryLevel.toFixed(1)),
            timestamp: new Date().toISOString()
        };

        call.write(update);

        robot.taskIndex = (robot.taskIndex + 1) % taskSequence.length;

    }, 10000);

    call.on('cancelled', () => {
        console.log(`Client cancelled robot streaming for ${robotId}`);
        clearInterval(interval);
    });

    call.on('end', () => {
        console.log(`Client ended robot streaming for ${robotId}`);
        clearInterval(interval);
        call.end();
    });
}

function RobotCommandStream(call) {
    // Keep active robot states per client stream
    const robotStates = {}; 

    call.on('data', (command) => {
        const { robotId, command: cmd } = command;

        if (!robotStates[robotId]) {
            robotStates[robotId] = createInitialRobotState(robotId);
        }

        const robot = robotStates[robotId];
        robot.lastCommand = cmd;
        console.log(`[${robotId}] Received command: ${cmd}`);
    });

    const interval = setInterval(() => {
        Object.values(robotStates).forEach(robot => {
            // Apply behavior based on last command
            switch (robot.lastCommand) {
                case 'Pause':
                    robot.currentTask = 'Paused';
                    break;

                case 'Return':
                    robot.position = 'Warehouse';
                    robot.currentTask = 'Returning';
                    robot.containerLoad = 0;
                    break;

                case 'Resume':
                    robot.currentTask = taskSequence[robot.taskIndex];
                    robot.taskIndex = (robot.taskIndex + 1) % taskSequence.length;
                    break;

                default:
                    // Continue auto behavior if no command or Resume
                    robot.currentTask = taskSequence[robot.taskIndex];
                    robot.taskIndex = (robot.taskIndex + 1) % taskSequence.length;
            }

            // Simulate battery + movement
            if (robot.currentTask !== 'Charging') {
                robot.batteryLevel = Math.max(0, robot.batteryLevel - (Math.random() * 0.5 + 0.2));
            } else {
                robot.batteryLevel = Math.min(100, robot.batteryLevel + (Math.random() * 2 + 1));
            }

            const update = {
                robotId: robot.robotId,
                position: robot.position,
                currentTask: robot.currentTask,
                containerLoadPercent: parseFloat(robot.containerLoad.toFixed(1)),
                batteryLevelPercent: parseFloat(robot.batteryLevel.toFixed(1)),
                timestamp: new Date().toISOString()
            };

            call.write(update);
        });
    }, 8000);

    call.on('end', () => {
        clearInterval(interval);
        call.end();
    });

    call.on('error', (err) => {
        console.error('Robot command stream error:', err);
        clearInterval(interval);
    });
}

module.exports = {
    StreamRobotStatus,
    RobotCommandStream
};