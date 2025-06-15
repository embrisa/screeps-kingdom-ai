'use strict';

function generateBasicBody(energyBudget) {
    const body = [];
    const partSet = [WORK, CARRY, MOVE];
    const setCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
    const maxParts = 50; // Screeps hard limit
    while (energyBudget >= setCost && body.length + partSet.length <= maxParts) {
        body.push(...partSet);
        energyBudget -= setCost;
    }
    return body;
}

// src/utils/Logger.ts
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
    LogLevel[LogLevel["NONE"] = 5] = "NONE";
})(LogLevel || (LogLevel = {}));
const logLevelToColor = {
    [LogLevel.DEBUG]: "gray",
    [LogLevel.INFO]: "white",
    [LogLevel.WARN]: "yellow",
    [LogLevel.ERROR]: "red",
    [LogLevel.FATAL]: "red",
};
function getLogLevel() {
    return Memory.logLevel ?? LogLevel.INFO;
}
function color(str, color) {
    return `<span style="color:${color}">${str}</span>`;
}
function log(level, message, ...args) {
    if (level < getLogLevel()) {
        return;
    }
    const colorStr = logLevelToColor[level] ?? "white";
    const tick = color(`[${Game.time}]`, "gray");
    const output = `${tick} ${color(message, colorStr)}`;
    console.log(output, ...args);
}
const Logger = {
    debug: (message, ...args) => log(LogLevel.DEBUG, message, ...args),
    info: (message, ...args) => log(LogLevel.INFO, message, ...args),
    warn: (message, ...args) => log(LogLevel.WARN, message, ...args),
    error: (message, ...args) => log(LogLevel.ERROR, message, ...args),
    fatal: (message, ...args) => log(LogLevel.FATAL, message, ...args),
};

const ROLE_MIN_COUNTS = {
    harvester: 2,
    upgrader: 1,
    builder: 1,
};
function runSpawnManager() {
    Object.values(Game.spawns).forEach((spawn) => {
        if (spawn.spawning)
            return;
        const counts = {
            harvester: 0,
            upgrader: 0,
            builder: 0,
        };
        for (const creep of Object.values(Game.creeps)) {
            const role = creep.memory.role;
            if (counts[role] !== undefined)
                counts[role] += 1;
        }
        const roleToSpawn = Object.keys(ROLE_MIN_COUNTS).find((role) => counts[role] < ROLE_MIN_COUNTS[role]);
        if (roleToSpawn) {
            const body = generateBasicBody(spawn.room.energyCapacityAvailable);
            const name = `${roleToSpawn}-${Game.time}`;
            const result = spawn.spawnCreep(body, name, {
                memory: { role: roleToSpawn },
            });
            if (result === OK) {
                Logger.info(`Spawning new creep: ${name}`);
            }
        }
    });
}

/**
 * A simple profiler that measures the CPU usage of a function.
 * @param name - The name of the function being profiled.
 * @param fn - The function to profile.
 */
function profile(name, fn) {
    const start = Game?.cpu?.getUsed ? Game.cpu.getUsed() : 0;
    fn();
    const end = Game?.cpu?.getUsed ? Game.cpu.getUsed() : 0;
    if (Game.time % 100 === 0) {
        Logger.debug(`[PROFILER] ${name}: ${(end - start).toFixed(3)} CPU`);
    }
}

const Harvester = {
    name: 'harvester',
    run(creep) {
        profile('harvester', () => {
            if (creep.store.getFreeCapacity() > 0) {
                const source = creep.pos.findClosestByPath(FIND_SOURCES);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                }
            }
            else {
                const targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => (structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION) &&
                        'store' in structure &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
                });
                if (targets.length) {
                    if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0]);
                    }
                }
                else if (creep.room.controller) {
                    // Fallback upgrade controller if nothing needs energy
                    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.controller);
                    }
                }
            }
        });
    },
};

const Upgrader = {
    name: 'upgrader',
    run(creep) {
        profile('upgrader', () => {
            if (creep.store[RESOURCE_ENERGY] === 0) {
                const source = creep.pos.findClosestByPath(FIND_SOURCES);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                }
            }
            else if (creep.room.controller) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
                }
            }
        });
    },
};

const Builder = {
    name: 'builder',
    run(creep) {
        profile('builder', () => {
            if (creep.store[RESOURCE_ENERGY] === 0) {
                const source = creep.pos.findClosestByPath(FIND_SOURCES);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                }
            }
            else {
                const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                if (target) {
                    if (creep.build(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                }
                else if (creep.room.controller) {
                    // If nothing to build, assist upgrade
                    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.controller);
                    }
                }
            }
        });
    },
};

// Temporary global declarations to appease TypeScript before installing type packages
// Screeps provides global Game object; Node provides console
const roleHandlers = {
    harvester: Harvester,
    upgrader: Upgrader,
    builder: Builder,
};
function loop() {
    runSpawnManager();
    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        const handler = roleHandlers[creep.memory.role];
        if (handler) {
            handler.run(creep);
        }
    }
    if (Game.time % 100 === 0) {
        Logger.info(`Tick: ${Game.time}`);
    }
}
// Screeps expects module.loop to be available in global scope
module.exports.loop = loop;

exports.loop = loop;
//# sourceMappingURL=main.js.map
