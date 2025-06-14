// @ts-nocheck
import { Role } from './base';
import { profile } from '../utils/profiler';

export const Upgrader: Role = {
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
            } else if (creep.room.controller) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
                }
            }
        });
    },
}; 