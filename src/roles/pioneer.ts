import { Role } from './base';
import { RoleName } from '../types';
import { Logger } from '../utils/Logger';
import { moveTo, handleStuck } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class PioneerRole implements Role {
  public name: RoleName = 'pioneer';

  public run(creep: Creep): void {
    const { homeRoom, targetRoom, recycling } = creep.memory;

    if (recycling) {
      this.recycle(creep, homeRoom);
      return;
    }

    if (!targetRoom) {
      Logger.error(`Pioneer ${creep.name} has no targetRoom.`);
      return;
    }

    if (creep.room.name !== targetRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, targetRoom), {
        visualizePathStyle: { stroke: '#aaffff' },
      });
      if (moveResult === ERR_STUCK) {
        Logger.warn(`Pioneer ${creep.name} stuck moving to target room. Deleting.`);
        creep.suicide();
      }
      return;
    }

    this.buildContainer(creep);
  }

  private buildContainer(creep: Creep): void {
    const source = creep.pos.findClosestByRange(FIND_SOURCES);
    if (!source) return;

    const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    })[0];

    if (container) {
      creep.memory.recycling = true;
      creep.say('♻️ recycle');
      return;
    }

    // State machine for building
    if (creep.memory.isBuilding && creep.store.getUsedCapacity() === 0) {
      creep.memory.isBuilding = false;
    }
    if (!creep.memory.isBuilding && creep.store.getFreeCapacity() === 0) {
      creep.memory.isBuilding = true;
    }

    if (creep.memory.isBuilding) {
      const site = source.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
      if (site) {
        if (creep.build(site) === ERR_NOT_IN_RANGE) {
          const moveResult = moveTo(creep, site, { visualizePathStyle: { stroke: '#ffff00' } });
          if (moveResult === ERR_STUCK) handleStuck(creep, 'isBuilding');
        }
      } else {
        // Create container site next to the source
        creep.room.createConstructionSite(source.pos, STRUCTURE_CONTAINER);
      }
    } else {
      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        const moveResult = moveTo(creep, source, { visualizePathStyle: { stroke: '#ffaa00' } });
        if (moveResult === ERR_STUCK) handleStuck(creep, 'isBuilding');
      }
    }
  }

  private recycle(creep: Creep, homeRoom?: string): void {
    if (!homeRoom) {
      Logger.warn(`Pioneer ${creep.name} cannot recycle without homeRoom.`);
      creep.suicide();
      return;
    }

    if (creep.room.name !== homeRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, homeRoom));
      if (moveResult === ERR_STUCK) {
        Logger.warn(`Pioneer ${creep.name} stuck returning home. Deleting.`);
        creep.suicide();
      }
      return;
    }

    const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
    if (spawn && spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
      const moveResult = moveTo(creep, spawn);
      if (moveResult === ERR_STUCK) {
        Logger.warn(`Pioneer ${creep.name} stuck recycling. Deleting.`);
        creep.suicide();
      }
    }
  }
}
