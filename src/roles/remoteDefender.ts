import { Role } from './base';
import { RoleName } from '../types';
import { moveTo, handleStuckClearProperty } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';
import { Logger } from '../utils/Logger';

export class RemoteDefenderRole implements Role {
  public name: RoleName = 'remoteDefender';

  public run(creep: Creep): void {
    const targetRoom = creep.memory.targetRoom;
    if (!targetRoom) return;

    if (creep.room.name !== targetRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, targetRoom), {
        visualizePathStyle: { stroke: '#ff0000' },
      });
      if (moveResult === ERR_STUCK) {
        handleStuckClearProperty(creep, 'targetRoom');
      }
      return;
    }

    const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (target) {
      if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
        const moveResult = moveTo(creep, target, {
          visualizePathStyle: { stroke: '#ff0000' },
        });
        if (moveResult === ERR_STUCK) {
          handleStuckClearProperty(creep, 'targetRoom');
        }
      }
    } else {
      // No hostiles, move to a rally point (e.g., center of the room)
      const moveResult = moveTo(creep, new RoomPosition(25, 25, targetRoom), {
        visualizePathStyle: { stroke: '#cccccc' },
      });
      if (moveResult === ERR_STUCK) {
        handleStuckClearProperty(creep, 'targetRoom');
      }
    }
  }
}
