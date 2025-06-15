import { Role } from './base';
import { RoleName } from '../types';
import { profile } from '../utils/profiler';
import { moveTo, handleStuck } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class BuilderRole implements Role {
  public name: RoleName = 'builder';

  public run(creep: Creep): void {
    profile('builder', () => {
      if (creep.memory.isBuilding && creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.isBuilding = false;
        creep.say('🔄 harvest');
      }
      if (!creep.memory.isBuilding && creep.store.getFreeCapacity() === 0) {
        creep.memory.isBuilding = true;
        creep.say('🚧 build');
      }

      if (creep.memory.isBuilding) {
        const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (target) {
          if (creep.build(target) === ERR_NOT_IN_RANGE) {
            const moveResult = moveTo(creep, target, { visualizePathStyle: { stroke: '#ffffff' } });
            if (moveResult === ERR_STUCK) {
              handleStuck(creep, 'isBuilding');
            }
          }
        } else {
          // If nothing to build, assist harvesting and filling spawn
          // This prevents the builder from idling or competing with the upgrader
          const spawnOrExtension = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) =>
              (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
              s.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
          });
          if (spawnOrExtension) {
            if (creep.transfer(spawnOrExtension, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              const moveResult = moveTo(creep, spawnOrExtension, {
                visualizePathStyle: { stroke: '#ffffff' },
              });
              if (moveResult === ERR_STUCK) {
                handleStuck(creep, 'isBuilding');
              }
            }
          }
        }
      } else {
        // Try withdraw from storage or containers first
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (s) =>
            (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
            s.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        });
        if (container) {
          const withdrawResult = creep.withdraw(container, RESOURCE_ENERGY);
          if (withdrawResult === ERR_NOT_IN_RANGE) {
            const moveResult = moveTo(creep, container, { visualizePathStyle: { stroke: '#ffaa00' } });
            if (moveResult === ERR_STUCK) {
              handleStuck(creep, 'isBuilding');
            }
            return;
          }
          if (withdrawResult === OK) return;
        }

        // Then withdraw from spawns/extensions if they have spare energy
        const energyStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (s) =>
            (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
            s.store.getUsedCapacity(RESOURCE_ENERGY) > 50,
        });
        if (energyStructure) {
          const withdrawResult = creep.withdraw(energyStructure, RESOURCE_ENERGY);
          if (withdrawResult === ERR_NOT_IN_RANGE) {
            const moveResult = moveTo(creep, energyStructure, {
              visualizePathStyle: { stroke: '#ffaa00' },
            });
            if (moveResult === ERR_STUCK) {
              handleStuck(creep, 'isBuilding');
            }
            return;
          }
          if (withdrawResult === OK) return;
        }

        // Fallback to harvesting
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            const moveResult = moveTo(creep, source, { visualizePathStyle: { stroke: '#ffaa00' } });
            if (moveResult === ERR_STUCK) {
              handleStuck(creep, 'isBuilding');
            }
          }
        }
      }
    });
  }
}
