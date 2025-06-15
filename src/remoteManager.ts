import { SpawnRequest, RoomIntel } from './types';
import { getTopExpansionTargets } from './expansionPlanner';

// Reusable helper type for a strongly-typed `global` object that includes our intel cache
type IntelGlobal = typeof global & { intel: Record<string, RoomIntel>; setIntelDirty: () => void };

type ExitKey = '1' | '3' | '5' | '7';

const INTEL_STALE_TICKS = 5000;
const REMOTE_ROOM_LIMIT = 3;

function enqueueSpawn(request: SpawnRequest): void {
  if (!Memory.spawnQueue) Memory.spawnQueue = [];
  Memory.spawnQueue.push(request);
}

function enqueueScout(roomName: string): void {
  if (!Memory.scoutQueue) Memory.scoutQueue = [];
  const queue = Memory.scoutQueue;
  if (!queue.includes(roomName)) queue.push(roomName);
}

function processScoutQueue(): void {
  const queue = Memory.scoutQueue || [];
  if (queue.length === 0) return;

  const targetRoom = queue[0];
  const existingScout = Object.values(Game.creeps).find(
    (c) => c.memory.role === 'scout' && c.memory.targetRoom === targetRoom,
  );
  if (existingScout) return; // already dispatched

  enqueueSpawn({
    role: 'scout',
    memory: { role: 'scout', targetRoom },
  });
}

function updateIntel(creep: Creep): void {
  const room = creep.room;
  const intel: RoomIntel = {
    sources: room.find(FIND_SOURCES).map((s) => ({ id: s.id, pos: { x: s.pos.x, y: s.pos.y } })),
    mineral: room.find(FIND_MINERALS)[0]?.mineralType,
    controller: room.controller
      ? {
          owner: room.controller.owner?.username,
          reservation: room.controller.reservation
            ? {
                username: room.controller.reservation.username,
                ticksToEnd: room.controller.reservation.ticksToEnd,
              }
            : undefined,
          level: room.controller.level,
        }
      : undefined,
    lastScouted: Game.time,
    hostile: room.find(FIND_HOSTILE_CREEPS).length > 0,
  };
  const globalObj = global as IntelGlobal;
  globalObj.intel[room.name] = intel;
  globalObj.setIntelDirty();
}

const MIN_ENERGY_FOR_EXPANSION = 50000;
const MIN_CPU_BUCKET_FOR_EXPANSION = 7000;

function canExpand(room: Room): boolean {
  if ((room.storage?.store.energy ?? 0) < MIN_ENERGY_FOR_EXPANSION) {
    return false;
  }
  if (Game.cpu.bucket < MIN_CPU_BUCKET_FOR_EXPANSION) {
    return false;
  }
  return true;
}

export function runRemoteManager(): void {
  // Cache expensive lookups
  const allCreeps = Object.values(Game.creeps);
  const ownedRooms = Object.values(Game.rooms).filter((r) => r.controller?.my);

  // Step 1: Evaluate owned rooms and decide remote targets
  for (const room of ownedRooms) {
    const exits = Game.map.describeExits(room.name);
    if (!exits) continue;

    for (const dir in exits) {
      const remoteName = exits[dir as ExitKey];
      if (!remoteName) continue;

      const globalObj = global as IntelGlobal;
      const intel = globalObj.intel[remoteName];
      if (!intel || Game.time - intel.lastScouted > INTEL_STALE_TICKS) {
        enqueueScout(remoteName);
      }
    }
  }

  // Step 2: Process scouting queue (spawn scouts)
  processScoutQueue();

  // Step 3: For each owned room, get top expansion targets and manage remote operations
  for (const room of ownedRooms) {
    // Gate expansion efforts by resource and CPU checks
    if (!canExpand(room)) {
      continue;
    }

    // Get intelligently scored expansion targets
    const expansionTargets = getTopExpansionTargets(room.name, REMOTE_ROOM_LIMIT);

    for (const target of expansionTargets) {
      const { roomName: remoteName, intel } = target;

      // Set the homeRoom in intel if it's not already there or has changed
      const globalObj = global as IntelGlobal;
      if (intel.homeRoom !== room.name) {
        (globalObj.intel[remoteName] as RoomIntel).homeRoom = room.name;
        globalObj.setIntelDirty();
      }

      const visibleRoom = Game.rooms[remoteName];

      // a) Ensure reservation
      const reserverExists = allCreeps.some(
        (c) => c.memory.role === 'reserver' && c.memory.targetRoom === remoteName,
      );
      if (!reserverExists) {
        enqueueSpawn({
          role: 'reserver',
          memory: { role: 'reserver', targetRoom: remoteName, homeRoom: room.name },
        });
      }

      // b) For each source, ensure a remoteHarvester
      intel.sources.forEach((src) => {
        const harvExists = allCreeps.some(
          (c) =>
            c.memory.role === 'remoteHarvester' &&
            c.memory.remoteSourceId === src.id &&
            c.memory.targetRoom === remoteName,
        );
        if (!harvExists) {
          enqueueSpawn({
            role: 'remoteHarvester',
            memory: {
              role: 'remoteHarvester',
              targetRoom: remoteName,
              remoteSourceId: src.id,
              homeRoom: room.name,
            },
          });
        }
      });

      // c) Ensure a hauler per remote room
      const haulerExists = allCreeps.some(
        (c) => c.memory.role === 'remoteHauler' && c.memory.targetRoom === remoteName,
      );
      if (!haulerExists) {
        enqueueSpawn({
          role: 'remoteHauler',
          memory: { role: 'remoteHauler', targetRoom: remoteName, homeRoom: room.name },
        });
      }

      // d) Handle hostiles – dispatch defenders
      if (intel.hostile) {
        const defenderExists = allCreeps.some(
          (c) => c.memory.role === 'remoteDefender' && c.memory.targetRoom === remoteName,
        );
        if (!defenderExists) {
          enqueueSpawn({
            role: 'remoteDefender',
            memory: { role: 'remoteDefender', targetRoom: remoteName, homeRoom: room.name },
          });
        }
      }

      // Optional: update hostile flag if room now visible
      if (visibleRoom) {
        const hasHostiles = visibleRoom.find(FIND_HOSTILE_CREEPS).length > 0;
        if ((globalObj.intel[remoteName] as RoomIntel).hostile !== hasHostiles) {
          (globalObj.intel[remoteName] as RoomIntel).hostile = hasHostiles;
          globalObj.setIntelDirty();
        }
      }
    }
  }

  // Step 4: Handle scouts updating intel when in target room
  allCreeps
    .filter((c) => c.memory.role === 'scout')
    .forEach((scout) => {
      if (!scout.memory.targetRoom) return;
      if (scout.room.name === scout.memory.targetRoom) {
        updateIntel(scout);
        // Finished scouting – recycle or get new target
        if (Memory.scoutQueue) {
          Memory.scoutQueue = Memory.scoutQueue.filter((r) => r !== scout.memory.targetRoom);
        }
        scout.suicide();
      } else {
        scout.moveTo(new RoomPosition(25, 25, scout.memory.targetRoom));
      }
    });
}
