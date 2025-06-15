// Temporary global declarations to appease TypeScript before installing type packages
// Screeps provides global Game object; Node provides console

// Type definitions are imported automatically by TypeScript
import { profile } from './utils/profiler';
import { Logger } from './utils/Logger';
import { statsManager } from './statsManager';
import { spawnManager } from './spawnManager';
import { TowerManager } from './towerManager';
import { DefenseManager } from './defenseManager';

// Role Imports
import { Role } from './roles/base';
import { HarvesterRole } from './roles/harvester';
import { UpgraderRole } from './roles/upgrader';
import { BuilderRole } from './roles/builder';
import { RepairerRole } from './roles/repairer';
import { HaulerRole } from './roles/hauler';
import { StaticHarvesterRole } from './roles/staticHarvester';
import { RemoteHarvesterRole } from './roles/remoteHarvester';
import { RemoteHaulerRole } from './roles/remoteHauler';
import { RemoteDefenderRole } from './roles/remoteDefender';
import { ReserverRole } from './roles/reserver';
import { PioneerRole } from './roles/pioneer';
import { ScoutRole } from './roles/scout';
import { DefenderRole } from './roles/defender';

// Initialize memory if it's not already
if (!Memory.logLevel) {
  Memory.logLevel = 1; // Default to INFO
}

const roleHandlers: { [key in Role['name']]: Role } = {
  harvester: new HarvesterRole(),
  upgrader: new UpgraderRole(),
  builder: new BuilderRole(),
  repairer: new RepairerRole(),
  hauler: new HaulerRole(),
  staticHarvester: new StaticHarvesterRole(),
  remoteHarvester: new RemoteHarvesterRole(),
  remoteHauler: new RemoteHaulerRole(),
  remoteDefender: new RemoteDefenderRole(),
  reserver: new ReserverRole(),
  pioneer: new PioneerRole(),
  scout: new ScoutRole(),
  defender: new DefenderRole(),
};

function mainLoop(): void {
  // Garbage collect dead creeps from memory
  if (Game.time % 100 === 0) {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  }

  // Run room-based managers
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (room.controller && room.controller.my) {
      spawnManager.run(room);
      new DefenseManager(room).run();
      new TowerManager(room).run();
    }
  }

  // Run creep roles
  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    if (creep.spawning) continue;

    const handler = roleHandlers[creep.memory.role as Role['name']];
    if (handler) {
      profile(`Role[${creep.memory.role}]`, () => handler.run(creep));
    } else {
      Logger.warn(`No handler for creep ${creepName} with role: ${creep.memory.role}`);
    }
  }

  // Run global managers
  statsManager.run();
}

// Screeps expects module.loop to be available in global scope
module.exports.loop = () => {
  profile('loop', mainLoop);
};
