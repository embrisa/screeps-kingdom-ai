import { Role } from './base';
import { RoleName } from '../types';
import { moveTo } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';
import { Logger } from '../utils/Logger';

export class ScoutRole implements Role {
  public name: RoleName = 'scout';

  public run(creep: Creep): void {
    const { targetRoom } = creep.memory;

    if (!targetRoom) {
      // No target, just move randomly to explore
      const x = Math.floor(Math.random() * 48) + 1;
      const y = Math.floor(Math.random() * 48) + 1;
      const moveResult = moveTo(creep, new RoomPosition(x, y, creep.room.name), {
        reusePath: 5,
        visualizePathStyle: { stroke: '#cccccc' },
      });
      if (moveResult === ERR_STUCK) {
        Logger.warn(`Scout ${creep.name} is stuck exploring. Attempting random move.`);
        const directions: DirectionConstant[] = [1, 2, 3, 4, 5, 6, 7, 8];
        const randomDir = directions[Math.floor(Math.random() * directions.length)];
        creep.move(randomDir);
        creep.memory.stuckTicks = 0;
      }
      return;
    }

    if (creep.room.name !== targetRoom) {
      const moveResult = moveTo(creep, new RoomPosition(25, 25, targetRoom), {
        reusePath: 10,
        visualizePathStyle: { stroke: '#cccccc' },
      });
      if (moveResult === ERR_STUCK) {
        Logger.warn(`Scout ${creep.name} is stuck moving to target room. Aborting.`);
        delete creep.memory.targetRoom;
        creep.memory.stuckTicks = 0;
      }
    } else {
      // Arrived in target room, mission complete for now.
      // Could add logic to gather intel here.
      // For now, let it be reassigned or just idle.
      creep.say('✅');
    }
  }
}
