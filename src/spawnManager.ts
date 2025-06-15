import { generateBody } from './utils/bodyGenerator';
import { RoleName } from './types';
import { Logger } from './utils/Logger';
import _ from 'lodash';

const SPAWN_PRIORITIES: RoleName[] = [
  'harvester',
  'staticHarvester',
  'hauler',
  'builder',
  'upgrader',
  'repairer',
  'pioneer',
  'reserver',
  'remoteHarvester',
  'remoteHauler',
  'defender',
  'remoteDefender',
  'scout'
];

const ROLE_BASE_COUNTS: Record<RoleName, number> = {
  harvester: 2,
  upgrader: 1,
  builder: 1,
  hauler: 0,
  repairer: 0,
  defender: 0,
  staticHarvester: 0,
  scout: 0,
  reserver: 0,
  pioneer: 0,
  remoteHarvester: 0,
  remoteHauler: 0,
  remoteDefender: 0,
};

class SpawnManager {
  public run(room: Room): void {
    const spawns = room.find(FIND_MY_SPAWNS, { filter: (spawn) => !spawn.spawning });
    if (spawns.length === 0) return;
    const spawn = spawns[0];

    // Dynamic role count adjustment
    const sources = room.find(FIND_SOURCES);
    const containers = room.find(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    });

    const desiredCounts = { ...ROLE_BASE_COUNTS };

    if (containers.length > 0) {
      desiredCounts.staticHarvester = sources.length;
      desiredCounts.hauler = 1; // At least one hauler if we have containers
      desiredCounts.harvester = 0; // Phase out basic harvesters
    }

    // Dynamically adjust upgrader count based on storage and controller level
    desiredCounts.upgrader = 1; // Always have at least one to prevent decay

    if (room.storage) {
      const storedEnergy = room.storage.store.getUsedCapacity(RESOURCE_ENERGY);
      if (storedEnergy > 400000) {
        desiredCounts.upgrader = 4;
      } else if (storedEnergy > 200000) {
        desiredCounts.upgrader = 3;
      } else if (storedEnergy > 50000) {
        desiredCounts.upgrader = 2;
      }
    }

    // At RCL8, a single large upgrader is often enough to hit the 15-per-tick cap
    if (room.controller && room.controller.level === 8) {
      desiredCounts.upgrader = 1;
    }

    const damagedStructures = room.find(FIND_STRUCTURES, {
      filter: (s) =>
        s.hits < s.hitsMax * 0.8 &&
        s.structureType !== STRUCTURE_WALL &&
        s.structureType !== STRUCTURE_RAMPART,
    });

    if (damagedStructures.length > 0) {
      desiredCounts.repairer = 1;
    }

    const currentCreeps = _.filter(Game.creeps, (c) => c.memory.homeRoom === room.name);
    const currentCounts = _.countBy(currentCreeps, (c) => c.memory.role);

    // Emergency check: if no harvesters (RCL 1) or no haulers (RCL 2+), spawn a basic one immediately
    const isEmergency =
      (desiredCounts.harvester > 0 && (currentCounts.harvester || 0) === 0) ||
      (desiredCounts.hauler > 0 && (currentCounts.hauler || 0) === 0);

    if (isEmergency) {
      const emergencyRole: RoleName = desiredCounts.hauler > 0 ? 'hauler' : 'harvester';
      const body = generateBody(emergencyRole, room.energyAvailable);
      if (body.length > 0) {
        const name = `${emergencyRole}-EMG-${Game.time}`;
        const memory: CreepMemory = { role: emergencyRole, homeRoom: room.name };
        const result = spawn.spawnCreep(body, name, { memory });
        if (result === OK) {
          Logger.warn(`EMERGENCY SPAWN of ${name} in ${room.name}`);
          return;
        }
      }
    }

    // New prioritized spawn logic
    for (const role of SPAWN_PRIORITIES) {
      const desired = desiredCounts[role] || 0;
      const current = currentCounts[role] || 0;

      if (current < desired) {
        // This is the highest-priority, affordable role to spawn.
        const energyBudget = room.energyCapacityAvailable;
        const body = generateBody(role, energyBudget);

        if (body.length > 0) {
          const name = `${role}-${Game.time}`;
          const memory: CreepMemory = { role, homeRoom: room.name };
          const result = spawn.spawnCreep(body, name, { memory });

          if (result === OK) {
            Logger.info(`Spawning new ${role} in ${room.name}: ${name}`);
            return; // Exit after successful spawn attempt
          } else if (result !== ERR_BUSY) {
            const bodyCost = body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
            Logger.warn(
              `Failed to spawn ${role} in ${room.name}. Error: ${result}. Body: [${body}] Cost: ${bodyCost}`
            );
          }
          // If spawn is busy, or we failed for some reason, we still don't want to try other roles this tick.
          return;
        }
      }
    }
  }
}

export const spawnManager = new SpawnManager();
