import { Logger } from './Logger';
import { ERR_STUCK } from './constants';

export type MoveToReturnCode =
    | CreepMoveReturnCode
    | typeof ERR_STUCK
    | ERR_NO_PATH
    | ERR_INVALID_TARGET
    | ERR_NOT_FOUND;

/**
 * A wrapper for creep movement that includes anti-stuck detection.
 * If a creep has not moved in 3 ticks, it returns ERR_STUCK.
 * @param creep The creep to move.
 * @param target The target position or object.
 * @param opts Standard MoveToOpts.
 * @returns The result of creep.moveTo() or ERR_STUCK.
 */
export function moveTo(
    creep: Creep,
    target: RoomPosition | { pos: RoomPosition },
    opts: MoveToOpts = {},
): MoveToReturnCode {
    // Add visualization to the options if not present
    if (!opts.visualizePathStyle) {
        opts.visualizePathStyle = { stroke: '#ffffff', opacity: 0.5, lineStyle: 'dashed' };
    }

    // --- Anti-Stuck Detection ---
    const moveResult = creep.moveTo(target, opts);

    // Only track stuck ticks if we **tried** to move this tick
    if (moveResult === OK || moveResult === ERR_TIRED) {
        if (creep.memory.lastPos) {
            const lastPos = creep.memory.lastPos;
            if (lastPos.x === creep.pos.x && lastPos.y === creep.pos.y) {
                creep.memory.stuckTicks = (creep.memory.stuckTicks || 0) + 1;
            } else {
                creep.memory.stuckTicks = 0;
            }
        }
        creep.memory.lastPos = { x: creep.pos.x, y: creep.pos.y };

        if ((creep.memory.stuckTicks || 0) >= 3) {
            Logger.warn(`Creep ${creep.name} is stuck for 3 ticks.`);
            return ERR_STUCK;
        }
    } else {
        // Reset counter if no movement attempted (e.g., already in range)
        creep.memory.stuckTicks = 0;
    }

    return moveResult;
}

/**
 * Handles stuck creeps with a two-stage approach:
 * 1. First attempt to physically unstick with a random move
 * 2. If that fails, flip the creep's state as a last resort
 */
export function handleStuck(creep: Creep, stateProperty: string): void {
    Logger.warn(`${creep.memory.role} ${creep.name} is stuck. Attempting to unstick with a random move.`);

    // Attempt a random move to break the physical block
    const directions: DirectionConstant[] = [1, 2, 3, 4, 5, 6, 7, 8];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    const moveResult = creep.move(randomDir);

    // If we managed to move, reset the counter. The creep can re-evaluate next tick.
    if (moveResult === OK) {
        Logger.info(`Creep ${creep.name} unstuck itself.`);
        creep.memory.stuckTicks = 0;
    } else {
        // If even the random move failed, then we escalate to flipping the state.
        Logger.error(`${creep.memory.role} ${creep.name} could not unstuck. Flipping state as a last resort.`);
        (creep.memory as any)[stateProperty] = !(creep.memory as any)[stateProperty];
        creep.memory.stuckTicks = 0;
    }
}

/**
 * Handles stuck creeps by clearing a specific memory property
 * Used for roles that use target-based logic rather than boolean states
 */
export function handleStuckClearProperty(creep: Creep, propertyToClear: string): void {
    Logger.warn(`${creep.memory.role} ${creep.name} is stuck. Attempting to unstick with a random move.`);

    // Attempt a random move to break the physical block
    const directions: DirectionConstant[] = [1, 2, 3, 4, 5, 6, 7, 8];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    const moveResult = creep.move(randomDir);

    // If we managed to move, reset the counter. The creep can re-evaluate next tick.
    if (moveResult === OK) {
        Logger.info(`Creep ${creep.name} unstuck itself.`);
        creep.memory.stuckTicks = 0;
    } else {
        // If even the random move failed, then we escalate to clearing the property.
        Logger.error(`${creep.memory.role} ${creep.name} could not unstuck. Clearing ${propertyToClear} as a last resort.`);
        delete (creep.memory as any)[propertyToClear];
        creep.memory.stuckTicks = 0;
    }
} 