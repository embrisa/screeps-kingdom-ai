/* eslint-disable @typescript-eslint/no-unused-vars */
// Global type declarations and Memory schema for Screeps Kingdom AI

import { LogLevel } from './utils/Logger';

export type RoleName =
  | 'harvester'
  | 'upgrader'
  | 'builder'
  | 'hauler'
  | 'repairer'
  | 'staticHarvester'
  | 'scout'
  | 'reserver'
  | 'pioneer'
  | 'remoteHarvester'
  | 'remoteHauler'
  | 'remoteDefender'
  | 'defender';

export interface RoomStats {
  controller?: {
    level: number;
    progress: number;
    progressTotal: number;
    ticksToDowngrade: number;
  };
  energy?: {
    available: number;
    capacity: number;
  };
  storage?: {
    energy: number;
    total: number;
  };
  construction?: {
    count: number;
    progress: number;
    progressTotal: number;
  };
}

export interface RoomPlan {
  paths: { [key: string]: SerializedPos[] };
  lastStructureCount?: number;
}

export interface SerializedPos {
  x: number;
  y: number;
}

export interface StatsMemory {
  gcl: {
    level: number;
    progress: number;
    progressTotal: number;
  };
  gpl: {
    level: number;
    progress: number;
    progressTotal: number;
  };
  cpu: {
    bucket: number;
    limit: number;
    used: number;
  };
  creeps: { [key in RoleName]?: number };
  rooms: { [key: string]: RoomStats };
  remote?: {
    activeRooms: number;
    totalHighways: number;
    energyHauled: number;
    remoteCreepCount: number;
    averageDistance: number;
  };
  energyHarvested?: number;
  spawnIdleTicks?: number;
}

// Augment global Screeps interfaces
declare global {
  interface CreepMemory {
    role: RoleName;
    homeRoom?: string;
    working?: boolean;
    recycling?: boolean;
    sourceId?: Id<Source>;
    targetRoom?: string;
    containerId?: Id<StructureContainer>;
    remoteSourceId?: Id<Source>;
    // Error handling and position tracking
    lastPos?: { x: number; y: number };
    stuckTicks?: number;
    isReturning?: boolean;
    homeRoom: string;
    path?: PathStep[];
    stuckCount?: number;
    squad?: string;
  }

  interface Memory {
    stats?: StatsMemory;
    uuid: number;
    log: unknown;
    logLevel: LogLevel;
    roomPlans?: { [roomName: string]: RoomPlan };
    spawnQueue?: SpawnRequest[];
    highways?: { [highwayId: string]: Highway };
    scoutQueue?: string[];
    remoteRooms?: { [roomName: string]: RemoteRoomMemory };
    roomPlan?: RoomPlan;
    threatProfile?: ThreatProfile;
    defenseStatus?: DefenseStatus;
  }

  // The global intel cache and the mutator helper are defined in `NodeJS.Global` below.
}

export {};

export interface Highway {
  path: { x: number; y: number; roomName: string }[];
  createdAt: number;
}

// --- Phase 3 Types ---
export interface SpawnRequest {
  role: RoleName;
  memory: CreepMemory;
  roomName?: string; // optional – specific spawn room
}

export interface RoomIntel {
  sources: { id: Id<Source>; pos: SerializedPos }[];
  mineral?: MineralConstant;
  controller?: {
    owner?: string;
    reservation?: { username: string; ticksToEnd: number };
    level?: number;
  };
  homeRoom?: string; // The primary room managing this remote room
  lastScouted: number;
  hostile?: boolean;
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
namespace NodeJS {
  // Extending the NodeJS global type so we can use `global.intel` and `global.setIntelDirty` without casting to `any`.
  // This allows us to avoid `as any` throughout the code-base while keeping strong typing.
  // The declaration is placed inside `declare global` to merge correctly.
  interface Global {
    /**
     * Cached intel information keyed by room name. Populated from RawMemory segments
     * in `main.ts` and mutated by the scouting / remote-ops pipeline.
     */
    intel?: { [roomName: string]: RoomIntel };
    /**
     * Marks the intel cache as dirty so it will be persisted back to the segment
     * at the end of the current tick.
     */
    setIntelDirty: () => void;
  }
}

export interface ThreatProfile {
  level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'PEACETIME' | 'HARASS' | 'SIEGE' | 'CONTROLLER_ATTACK';
  dps: number;
  heal: number;
  hostileCount: number;
  lastUpdated: number;
}

export interface DefenseStatus {
  mode: 'IDLE' | 'REPAIR' | 'ATTACK';
  focusTarget?: Id<Creep>;
  repairTarget?: Id<Structure>;
}

export interface RemoteRoomMemory {
  homeRoom: string;
  sources?: Id<Source>[];
  mineral?: MineralConstant;
}
