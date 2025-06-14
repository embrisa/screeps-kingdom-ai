import { Role } from './base';
import { profile } from '../utils/profiler';

export const Harvester: Role = {
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
            } else {
                const targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure: any) =>
                        (structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_EXTENSION) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
                });
                if (targets.length) {
                    if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0]);
                    }
                } else if (creep.room.controller) {
                    // Fallback upgrade controller if nothing needs energy
                    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.controller);
                    }
                }
            }
        });
    },
}; 