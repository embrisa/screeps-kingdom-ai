export {};

declare global {
  interface ThreatProfile {
    level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: 'PEACETIME' | 'HARASS' | 'SIEGE' | 'CONTROLLER_ATTACK';
    dps: number;
    heal: number;
    hostileCount: number;
    lastUpdated: number;
  }

  interface DefenseStatus {
    mode: 'IDLE' | 'REPAIR' | 'ATTACK';
    focusTarget?: Id<Creep>;
    repairTarget?: Id<Structure>;
  }

  interface RoomMemory {
    threatProfile?: ThreatProfile;
    defenseStatus?: DefenseStatus;
    lastCriticalAlert?: number;
    safeModeQueued?: boolean;
  }

  interface CreepMemory {
    squad?: string;
    isUpgrading?: boolean;
    isBuilding?: boolean;
    targetId?: Id<Creep | Structure>;
  }

  interface SpawnRequest {
    role: RoleName;
    memory: CreepMemory;
    priority: number;
  }
}
