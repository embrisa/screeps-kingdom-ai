// Global type declarations and Memory schema for Screeps Kingdom AI

export type RoleName = 'harvester' | 'upgrader' | 'builder';

export interface CreepMemory {
    role: RoleName;
    working?: boolean;
}

export interface RoomMemory {
    // Future room-specific data
}

export interface StatsMemory {
    energyHarvested?: number;
    spawnIdleTicks?: number;
}

// Extend the built-in Memory interface (thin placeholder until @types/screeps installed)
declare global {
    interface Memory {
        stats?: StatsMemory;
    }
}

// Minimal globals so TypeScript compiles without full Screeps typings
declare const Game: any;
declare const Memory: any;
declare const BODYPART_COST: Record<string, number>;
declare const FIND_SOURCES: number;
declare const STRUCTURE_SPAWN: string;
declare const STRUCTURE_EXTENSION: string;
declare const RESOURCE_ENERGY: string;
declare const ERR_NOT_IN_RANGE: number;
declare const OK: number;
declare const FIND_STRUCTURES: number;
declare const FIND_CONSTRUCTION_SITES: number;

declare type BodyPartConstant = string;

declare const WORK: BodyPartConstant;
declare const CARRY: BodyPartConstant;
declare const MOVE: BodyPartConstant;

declare const console: any;

export { }; 