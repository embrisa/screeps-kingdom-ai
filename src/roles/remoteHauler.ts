import { Role } from './base';
import { RoleName } from '../types';
import { Logger } from '../utils/Logger';
import { moveTo, handleStuck } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class RemoteHaulerRole implements Role {
  public name: RoleName = 'remoteHauler';

  public run(creep: Creep): void {
    // State machine: if full, return home. If empty, go to target.
    if (creep.memory.isReturning && creep.store.getUsedCapacity() === 0) {
      creep.memory.isReturning = false;
    }
    if (!creep.memory.isReturning && creep.store.getFreeCapacity() === 0) {
      creep.memory.isReturning = true;
    }

    if (creep.memory.isReturning) {
      this.deliverEnergy(creep);
    } else {
      this.fetchEnergy(creep);
    }
  }

  private fetchEnergy(creep: Creep): void {
    const { targetRoom } = creep.memory;
    if (!targetRoom) {
      Logger.error(`RemoteHauler ${creep.name} has no targetRoom.`);
      return;
    }

    if (creep.room.name !== targetRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, targetRoom), {
        visualizePathStyle: { stroke: '#ffaa00' },
      });
      if (moveResult === ERR_STUCK) {
        handleStuck(creep, 'isReturning');
      }
    } else {
      // In target room, find energy
      this.findAndPickupEnergy(creep);
    }
  }

  private deliverEnergy(creep: Creep): void {
    const { homeRoom } = creep.memory;
    if (!homeRoom) {
      Logger.error(`RemoteHauler ${creep.name} has no homeRoom.`);
      return;
    }

    if (creep.room.name !== homeRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, homeRoom), {
        visualizePathStyle: { stroke: '#ffffff' },
      });
      if (moveResult === ERR_STUCK) {
        handleStuck(creep, 'isReturning');
      }
    } else {
      // In home room, deliver energy
      this.deliverEnergyToTarget(creep);
    }
  }

  private findAndPickupEnergy(creep: Creep): void {
    // Prioritize dropped resources, then containers
    const target =
      creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) =>
          s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity(RESOURCE_ENERGY) > 100,
      });

    if (target) {
      let moveResult;
      if (target instanceof Resource) {
        if (creep.pickup(target) === ERR_NOT_IN_RANGE) {
          moveResult = moveTo(creep, target, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      } else {
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          moveResult = moveTo(creep, target, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      }
      if (moveResult === ERR_STUCK) {
        handleStuck(creep, 'isReturning');
      }
    }
  }

  private deliverEnergyToTarget(creep: Creep): void {
    const target = creep.room.storage || creep.pos.findClosestByPath(FIND_MY_SPAWNS);
    if (target) {
      if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        const moveResult = moveTo(creep, target, { visualizePathStyle: { stroke: '#ffffff' } });
        if (moveResult === ERR_STUCK) {
          handleStuck(creep, 'isReturning');
        }
      }
    }
  }
}
