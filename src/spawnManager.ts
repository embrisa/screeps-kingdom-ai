// @ts-nocheck
import { Harvester } from './roles/harvester';
import { Upgrader } from './roles/upgrader';
import { Builder } from './roles/builder';
import { generateBasicBody } from './utils/bodyGenerator';

const ROLE_MIN_COUNTS: Record<string, number> = {
    harvester: 2,
    upgrader: 1,
    builder: 1,
};

export function runSpawnManager(): void {
    for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];

        if (spawn.spawning) {
            continue;
        }

        const counts: Record<string, number> = {
            harvester: 0,
            upgrader: 0,
            builder: 0,
        };

        for (const creepName in Game.creeps) {
            const role = Game.creeps[creepName].memory.role;
            if (counts[role] !== undefined) {
                counts[role] += 1;
            }
        }

        let roleToSpawn: string | undefined;
        for (const role in ROLE_MIN_COUNTS) {
            if (counts[role] < ROLE_MIN_COUNTS[role]) {
                roleToSpawn = role;
                break;
            }
        }

        if (roleToSpawn) {
            const body = generateBasicBody(spawn.room.energyCapacityAvailable);
            const name = `${roleToSpawn}-${Game.time}`;
            const result = spawn.spawnCreep(body, name, {
                memory: { role: roleToSpawn },
            });
            if (result === OK) {
                console.log(`Spawning new creep: ${name}`);
            }
        }
    }
} 