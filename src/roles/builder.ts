// @ts-nocheck
import { Role } from './base';
import { profile } from '../utils/profiler';

export const Builder: Role = {
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
            } else {
                const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                if (target) {
                    if (creep.build(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target);
                    }
                } else if (creep.room.controller) {
                    // If nothing to build, assist upgrade
                    if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(creep.room.controller);
                    }
                }
            }
        });
    },
}; 