import { Role } from './base';
import { RoleName } from '../types';
import { moveTo, handleStuck } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class RepairerRole implements Role {
  public name: RoleName = 'repairer';

  public run(creep: Creep): void {
    if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
      creep.memory.working = false;
      creep.say('🔄 fetch');
    }
    if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
      creep.say('🛠️ repair');
    }

    if (creep.memory.working) {
      this.repairStructures(creep);
    } else {
      this.fetchEnergy(creep);
    }
  }

  private repairStructures(creep: Creep): void {
    const threatProfile = creep.room.memory.threatProfile;
    const isUnderAttack = threatProfile && threatProfile.level !== 'NONE';

    // Priority 1: Critical ramparts during combat
    let target: Structure | null = null;
    if (isUnderAttack) {
      target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < s.hitsMax * 0.3,
      });
    }

    // Priority 2: Critical containers (< 50% health)
    if (!target) {
      target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax * 0.5,
      });
    }

    // Priority 3: Other containers (< 80% health)
    if (!target) {
      target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax * 0.8,
      });
    }

    // Priority 4: Roads and other infrastructure
    if (!target) {
      target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) =>
          s.hits < s.hitsMax * 0.8 &&
          s.structureType !== STRUCTURE_WALL &&
          s.structureType !== STRUCTURE_RAMPART,
      });
    }

    // Priority 5: Peacetime rampart maintenance (only if not under attack)
    if (!target && !isUnderAttack) {
      target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < s.hitsMax * 0.8,
      });
    }

    if (target) {
      if (creep.repair(target) === ERR_NOT_IN_RANGE) {
        const moveResult = moveTo(creep, target, { visualizePathStyle: { stroke: '#00ff00' } });
        if (moveResult === ERR_STUCK) {
          handleStuck(creep, 'working');
        }
      }
    } else {
      // Nothing to repair, idle near spawn
      const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        const moveResult = moveTo(creep, spawn);
        if (moveResult === ERR_STUCK) {
          handleStuck(creep, 'working');
        }
      }
    }
  }

  private fetchEnergy(creep: Creep): void {
    const energySource =
      creep.room.storage ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) =>
          (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
          s.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
      });

    if (energySource) {
      if (creep.withdraw(energySource, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        const moveResult = moveTo(creep, energySource, { visualizePathStyle: { stroke: '#ffaa00' } });
        if (moveResult === ERR_STUCK) {
          handleStuck(creep, 'working');
        }
      }
    } else {
      // No stored energy, harvest from source as fallback
      const source = creep.pos.findClosestByPath(FIND_SOURCES);
      if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          const moveResult = moveTo(creep, source, { visualizePathStyle: { stroke: '#ffaa00' } });
          if (moveResult === ERR_STUCK) {
            handleStuck(creep, 'working');
          }
        }
      }
    }
  }
}
