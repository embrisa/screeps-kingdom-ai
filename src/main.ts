// Temporary global declarations to appease TypeScript before installing type packages
declare const Game: any;
declare const console: any;
// console is available in Node.js runtime typings

// @ts-nocheck
import { runSpawnManager } from './spawnManager';
import { Harvester } from './roles/harvester';
import { Upgrader } from './roles/upgrader';
import { Builder } from './roles/builder';

const roleHandlers: Record<string, any> = {
    harvester: Harvester,
    upgrader: Upgrader,
    builder: Builder,
};

export function loop(): void {
    runSpawnManager();

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        const handler = roleHandlers[creep.memory.role];
        if (handler) {
            handler.run(creep);
        }
    }

    if (Game.time % 100 === 0) {
        console.log(`Tick: ${Game.time}`);
    }
} 