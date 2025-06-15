import { Role } from './base';
import { RoleName } from '../types';
import { profile } from '../utils/profiler';
import { moveTo, handleStuck } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class HarvesterRole implements Role {
  public name: RoleName = 'harvester';

  public run(creep: Creep): void {
    profile('harvester', () => {
      if (creep.store.getFreeCapacity() > 0) {
        const source = creep.pos.findClosestByPath(FIND_SOURCES) as Source | null;
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            const moveResult = moveTo(creep, source, { visualizePathStyle: { stroke: '#ffaa00' } });
            if (moveResult === ERR_STUCK) {
              handleStuck(creep, 'working');
            }
          }
        }
      } else {
        const targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) =>
            (structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_EXTENSION) &&
            'store' in structure &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        });
        if (targets.length) {
          if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            const moveResult = moveTo(creep, targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
            if (moveResult === ERR_STUCK) {
              handleStuck(creep, 'working');
            }
          }
        }
      }
    });
  }
}
