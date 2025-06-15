interface CachedSearchResult {
  path: RoomPosition[];
  incomplete: boolean;
  time: number;
  structureHash?: string; // Hash of structures along the path for invalidation
}

interface RoomStructureCache {
  hash: string;
  lastUpdated: number;
}

const cache: { [key: string]: CachedSearchResult } = {};
const roomStructureCache: { [roomName: string]: RoomStructureCache } = {};
const CACHE_EXPIRATION_TICKS = 100; // Increased from 50 for better performance
const MAX_CACHE_SIZE = 1000; // Prevent memory bloat
const STRUCTURE_CHECK_INTERVAL = 50; // Check for structure changes every 50 ticks

function getStructureHash(roomName: string): string {
  const room = Game.rooms[roomName];
  if (!room) return '';

  // Create hash from structure positions and types
  const structures = room.find(FIND_STRUCTURES);
  const structureData = structures.map((s) => `${s.structureType}:${s.pos.x},${s.pos.y}`).sort();
  return structureData.join('|');
}

function isStructureHashValid(roomName: string, cachedHash?: string): boolean {
  if (!cachedHash) return false;

  const cached = roomStructureCache[roomName];
  if (cached && Game.time - cached.lastUpdated < STRUCTURE_CHECK_INTERVAL) {
    return cached.hash === cachedHash;
  }

  // Update structure cache
  const currentHash = getStructureHash(roomName);
  roomStructureCache[roomName] = {
    hash: currentHash,
    lastUpdated: Game.time,
  };

  return currentHash === cachedHash;
}

function cleanCache(): void {
  if (Object.keys(cache).length <= MAX_CACHE_SIZE) return;

  // Remove oldest entries when cache is full
  const entries = Object.entries(cache);
  entries.sort((a, b) => a[1].time - b[1].time);

  const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
  toRemove.forEach(([key]) => delete cache[key]);
}

export function findPathWithCache(
  origin: RoomPosition,
  destination: RoomPosition,
  opts: PathFinderOpts = {},
): CachedSearchResult {
  try {
    const key = `${origin.roomName}:${origin.x},${origin.y}-${destination.roomName}:${destination.x},${destination.y}-${JSON.stringify(opts)}`;

    const cached = cache[key];
    if (cached && Game.time - cached.time < CACHE_EXPIRATION_TICKS) {
      // Check if structures have changed in any room along the path
      const pathRooms = new Set<string>();
      pathRooms.add(origin.roomName);
      pathRooms.add(destination.roomName);
      cached.path.forEach((pos) => pathRooms.add(pos.roomName));

      let structuresValid = true;
      for (const roomName of pathRooms) {
        if (!isStructureHashValid(roomName, cached.structureHash)) {
          structuresValid = false;
          break;
        }
      }

      if (structuresValid) {
        return cached;
      } else {
        // Invalidate cache entry if structures changed
        delete cache[key];
      }
    }

    const result = PathFinder.search(origin, destination, opts);

    // Generate structure hash for path rooms
    const pathRooms = new Set<string>();
    pathRooms.add(origin.roomName);
    pathRooms.add(destination.roomName);
    result.path.forEach((pos) => pathRooms.add(pos.roomName));

    const structureHashes = Array.from(pathRooms).map((roomName) => getStructureHash(roomName));
    const combinedHash = structureHashes.join('::');

    const packed: CachedSearchResult = {
      path: result.path,
      incomplete: result.incomplete,
      time: Game.time,
      structureHash: combinedHash,
    };

    cache[key] = packed;
    cleanCache();
    return packed;
  } catch (error) {
    // Fallback to direct PathFinder call if cache fails
    console.log(`[PathCache] Error in findPathWithCache: ${error}, falling back to direct search`);
    const result = PathFinder.search(origin, destination, opts);
    return {
      path: result.path,
      incomplete: result.incomplete,
      time: Game.time,
    };
  }
}

export function invalidateRoomCache(roomName: string): void {
  // Clear all cache entries that involve this room
  const toDelete: string[] = [];
  for (const [key, cached] of Object.entries(cache)) {
    if (key.includes(roomName) || cached.path.some((pos) => pos.roomName === roomName)) {
      toDelete.push(key);
    }
  }
  toDelete.forEach((key) => delete cache[key]);

  // Clear room structure cache
  delete roomStructureCache[roomName];
}

export function getCacheStats(): { size: number; hitRate?: number } {
  return {
    size: Object.keys(cache).length,
    // Hit rate calculation would require additional tracking
  };
}
