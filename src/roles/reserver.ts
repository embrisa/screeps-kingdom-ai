import { Role } from './base';
import { RoleName } from '../types';
import { Logger } from '../utils/Logger';
import { moveTo, handleStuckClearProperty } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class ReserverRole implements Role {
  public name: RoleName = 'reserver';

  public run(creep: Creep): void {
    const { targetRoom } = creep.memory;

    if (!targetRoom) {
      Logger.error(`Reserver ${creep.name} has no targetRoom.`);
      return;
    }

    if (creep.room.name !== targetRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, targetRoom), {
        visualizePathStyle: { stroke: '#aaffff' },
      });
      if (moveResult === ERR_STUCK) {
        handleStuckClearProperty(creep, 'targetRoom');
      }
      return;
    }

    const controller = creep.room.controller;
    if (!controller) {
      Logger.error(`Reserver ${creep.name} cannot find controller in ${targetRoom}.`);
      return;
    }

    if (creep.reserveController(controller) === ERR_NOT_IN_RANGE) {
      const moveResult = moveTo(creep, controller, { visualizePathStyle: { stroke: '#aaffff' } });
      if (moveResult === ERR_STUCK) {
        handleStuckClearProperty(creep, 'targetRoom');
      }
    }
  }
}
