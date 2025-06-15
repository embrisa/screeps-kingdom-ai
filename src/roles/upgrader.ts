import { Role } from './base';
import { RoleName } from '../types';
import { profile } from '../utils/profiler';
import { moveTo, handleStuck } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class UpgraderRole implements Role {
  public name: RoleName = 'upgrader';

  public run(creep: Creep): void {
    profile('upgrader', () => {
      if (creep.memory.isUpgrading && creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.isUpgrading = false;
        creep.say('🔄 harvest');
      }
      if (!creep.memory.isUpgrading && creep.store.getFreeCapacity() === 0) {
        creep.memory.isUpgrading = true;
        creep.say('⚡ upgrade');
      }

      if (creep.memory.isUpgrading) {
        const controller = creep.room.controller;
        if (controller) {
          // Upgrade first; if not in range we move closer.
          const upgradeResult = creep.upgradeController(controller);
          if (upgradeResult === ERR_NOT_IN_RANGE) {
            const moveResult = moveTo(creep, controller, {
              visualizePathStyle: { stroke: '#ffffff' },
              range: 3, // stop at optimal upgrade range
            });
            if (moveResult === ERR_STUCK) {
              handleStuck(creep, 'isUpgrading');
            }
          }
        }
      } else {
        // Attempt to withdraw from storage first
        const storage = creep.room.storage;
        if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          const moveResult = moveTo(creep, storage, { visualizePathStyle: { stroke: '#ffaa00' } });
          if (moveResult === ERR_STUCK) {
            handleStuck(creep, 'isUpgrading');
          } else if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            // Handled by moveTo
          }
          return;
        }

        // Then, attempt to withdraw from containers
        const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: s =>
            (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
            s.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        });
        if (container) {
          const moveResult = moveTo(creep, container, { visualizePathStyle: { stroke: '#ffaa00' } });
          if (moveResult === ERR_STUCK) {
            handleStuck(creep, 'isUpgrading');
          } else if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            // Handled by moveTo
          }
          return;
        }

        // Next, attempt to withdraw from spawns or extensions
        const energyStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (s) =>
            (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
            s.store.getUsedCapacity(RESOURCE_ENERGY) > 50, // leave buffer for spawning
        });
        if (energyStructure) {
          const moveResult = moveTo(creep, energyStructure, { visualizePathStyle: { stroke: '#ffaa00' } });
          if (moveResult === ERR_STUCK) {
            handleStuck(creep, 'isUpgrading');
          } else if (creep.withdraw(energyStructure, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            // Handled by moveTo
          }
          return;
        }

        // Fallback to harvesting from active sources if no other options
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          const moveResult = moveTo(creep, source, { visualizePathStyle: { stroke: '#ffaa00' } });
          if (moveResult === ERR_STUCK) {
            handleStuck(creep, 'isUpgrading');
          } else if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            // Handled by moveTo
          }
        }
      }
    });
  }
}
