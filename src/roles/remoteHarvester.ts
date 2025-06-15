import { Role } from './base';
import { RoleName } from '../types';
import { Logger } from '../utils/Logger';
import { moveTo } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class RemoteHarvesterRole implements Role {
  public name: RoleName = 'remoteHarvester';

  public run(creep: Creep): void {
    const { targetRoom, remoteSourceId } = creep.memory;

    if (!targetRoom || !remoteSourceId) {
      Logger.error(`RemoteHarvester ${creep.name} has invalid memory`);
      return;
    }

    // Travel to target room
    if (creep.room.name !== targetRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, targetRoom), {
        visualizePathStyle: { stroke: '#ffaa00' },
      });
      if (moveResult === ERR_STUCK) {
        Logger.warn(`RemoteHarvester ${creep.name} stuck travelling. Deleting.`);
        creep.suicide();
      }
      return;
    }

    const source = Game.getObjectById(remoteSourceId);
    if (!source) {
      Logger.error(`RemoteHarvester ${creep.name} cannot find source ${remoteSourceId}`);
      // Invalidate memory and let it be reassigned or die
      delete creep.memory.remoteSourceId;
      return;
    }

    // Find container to stand on or adjacent spot
    const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    })[0];

    if (container && !creep.pos.isEqualTo(container.pos)) {
      const moveResult = moveTo(creep, container);
      if (moveResult === ERR_STUCK) {
        Logger.warn(`RemoteHarvester ${creep.name} is stuck moving to its container. Attempting random move.`);
        const directions: DirectionConstant[] = [1, 2, 3, 4, 5, 6, 7, 8];
        const randomDir = directions[Math.floor(Math.random() * directions.length)];
        creep.move(randomDir);
        creep.memory.stuckTicks = 0; // Wait
      }
      return;
    }
    if (!container && !creep.pos.isNearTo(source)) {
      const moveResult = moveTo(creep, source);
      if (moveResult === ERR_STUCK) {
        Logger.warn(`RemoteHarvester ${creep.name} is stuck moving to its source. Attempting random move.`);
        const directions: DirectionConstant[] = [1, 2, 3, 4, 5, 6, 7, 8];
        const randomDir = directions[Math.floor(Math.random() * directions.length)];
        creep.move(randomDir);
        creep.memory.stuckTicks = 0; // Wait
      }
      return;
    }

    // Repair container if needed
    if (
      container &&
      container.hits < container.hitsMax * 0.8 &&
      creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    ) {
      creep.repair(container);
      return;
    }

    // Harvest
    if (creep.store.getFreeCapacity() > 0) {
      creep.harvest(source);
    }

    // Transfer to container
    if (container && creep.store.getUsedCapacity() > 0) {
      creep.transfer(container, RESOURCE_ENERGY);
    }
  }
}
