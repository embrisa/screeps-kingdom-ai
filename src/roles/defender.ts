import { Role } from './base';
import { RoleName } from '../types';
import { Logger } from '../utils/Logger';
import { moveTo, handleStuckClearProperty } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class DefenderRole implements Role {
  public name: RoleName = 'defender';

  public run(creep: Creep): void {
    const targetId = creep.memory.targetId as Id<Creep> | undefined;

    if (!targetId) {
      // No target, move to rally point near controller
      if (creep.room.controller) {
        const moveResult = moveTo(creep, creep.room.controller.pos, { range: 5 });
        if (moveResult === ERR_STUCK) {
          // If stuck even when rallying, do nothing this tick
          creep.memory.stuckTicks = 0;
        }
      }
      return;
    }

    const target = Game.getObjectById(targetId);

    if (!target) {
      // Target is dead or gone
      delete creep.memory.targetId;
      Logger.info(`Defender ${creep.name} target ${targetId} is gone.`);
      return;
    }

    // Kiting logic
    if (creep.pos.inRangeTo(target, 3)) {
      if (creep.pos.getRangeTo(target) < 3) {
        // Flee if too close
        const fleePath = PathFinder.search(
          creep.pos,
          { pos: target.pos, range: 5 },
          { flee: true },
        );
        creep.moveByPath(fleePath.path);
      }
      creep.rangedAttack(target);
    } else {
      const moveResult = moveTo(creep, target, { visualizePathStyle: { stroke: '#ff0000' } });
      if (moveResult === ERR_STUCK) {
        handleStuckClearProperty(creep, 'targetId');
      }
    }
  }
}
