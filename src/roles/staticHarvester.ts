import { Role } from './base';
import { RoleName } from '../types';
import { Logger } from '../utils/Logger';
import { moveTo } from '../utils/movement';
import { ERR_STUCK } from '../utils/constants';

export class StaticHarvesterRole implements Role {
  public name: RoleName = 'staticHarvester';

  public run(creep: Creep): void {
    const sourceId = creep.memory.sourceId;
    if (!sourceId) {
      Logger.error(`StaticHarvester ${creep.name} has no sourceId in memory.`);
      return;
    }

    const source = Game.getObjectById(sourceId);
    if (!source) {
      Logger.error(`StaticHarvester ${creep.name} has an invalid sourceId: ${sourceId}`);
      return;
    }

    // Find container to stand on.
    // For now, we assume it's the one closest to the source.
    // A better approach would be to also store containerId in memory.
    const container = source.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER,
    });

    if (!container) {
      Logger.warn(
        `StaticHarvester ${creep.name} cannot find a container near source ${source.id}.`,
      );
      // Optional: move to a waiting flag or just stay put.
      return;
    }

    // If not on the container, move to it.
    if (!creep.pos.isEqualTo(container.pos)) {
      const moveResult = moveTo(creep, container, { visualizePathStyle: { stroke: '#ffaa00' } });
      if (moveResult === ERR_STUCK) {
        Logger.warn(`StaticHarvester ${creep.name} is stuck moving to its container. Attempting random move.`);
        const directions: DirectionConstant[] = [1, 2, 3, 4, 5, 6, 7, 8];
        const randomDir = directions[Math.floor(Math.random() * directions.length)];
        creep.move(randomDir);
        creep.memory.stuckTicks = 0; // Reset and wait
      }
      return;
    }

    // At the container, harvest.
    creep.harvest(source);
  }
}
