import { Role } from './base';
import { RoleName } from '../types';
import { moveTo, handleStuck } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class HaulerRole implements Role {
  public name: RoleName = 'hauler';

  public run(creep: Creep): void {
    if (creep.memory.working && creep.store.getUsedCapacity() === 0) {
      creep.memory.working = false;
      creep.say('🔄 fetch');
    }
    if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
      creep.say('⚡ deliver');
    }

    if (creep.memory.working) {
      this.deliverEnergy(creep);
    } else {
      this.fetchEnergy(creep);
    }
  }

  private deliverEnergy(creep: Creep): void {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s) =>
        (s.structureType === STRUCTURE_EXTENSION ||
          s.structureType === STRUCTURE_SPAWN ||
          s.structureType === STRUCTURE_TOWER) &&
        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
    });

    if (target) {
      if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        const moveResult = moveTo(creep, target, { visualizePathStyle: { stroke: '#ffffff' } });
        if (moveResult === ERR_STUCK) {
          handleStuck(creep, 'working');
        }
      }
    }
  }

  private fetchEnergy(creep: Creep): void {
    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity(RESOURCE_ENERGY) > 200,
    });

    if (container) {
      if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        const moveResult = moveTo(creep, container, { visualizePathStyle: { stroke: '#ffaa00' } });
        if (moveResult === ERR_STUCK) {
          handleStuck(creep, 'working');
        }
      }
    }
  }
}
