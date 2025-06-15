import { RoomIntel } from './types';
import { Logger } from './utils/Logger';

interface ScoredRoom {
  roomName: string;
  intel: RoomIntel;
  score: number;
  homeRoom: string;
}

const SCORE_WEIGHTS = {
  SOURCE: 10,
  DISTANCE_PENALTY: 0.2,
  MINERAL_BONUS: 5,
  HOSTILE_PENALTY: 50,
  CONTROLLER_OWNED_PENALTY: 100,
  CONTROLLER_RESERVED_PENALTY: 25,
};

function calculateRoomScore(roomName: string, intel: RoomIntel, homeRoomName: string): number {
  let score = 0;

  // Base score from sources
  score += intel.sources.length * SCORE_WEIGHTS.SOURCE;

  // Distance penalty
  const distance = Game.map.getRoomLinearDistance(roomName, homeRoomName, false);
  score -= distance * SCORE_WEIGHTS.DISTANCE_PENALTY;

  // Mineral bonus
  if (intel.mineral) {
    score += SCORE_WEIGHTS.MINERAL_BONUS;
  }

  // Hostile penalty
  if (intel.hostile) {
    score -= SCORE_WEIGHTS.HOSTILE_PENALTY;
  }

  // Controller penalties
  if (intel.controller) {
    if (intel.controller.owner) {
      score -= SCORE_WEIGHTS.CONTROLLER_OWNED_PENALTY;
    } else if (
      intel.controller.reservation &&
      intel.controller.reservation.username !== 'Screeps'
    ) {
      score -= SCORE_WEIGHTS.CONTROLLER_RESERVED_PENALTY;
    }
  }

  return score;
}

function isRoomViable(intel: RoomIntel): boolean {
  // Must have at least one source
  if (!intel.sources || intel.sources.length === 0) {
    return false;
  }

  // Skip rooms owned by other players
  if (intel.controller?.owner) {
    return false;
  }

  // Skip rooms with active hostiles (temporary)
  if (intel.hostile) {
    return false;
  }

  return true;
}

export function getTopExpansionTargets(homeRoomName: string, maxTargets = 3): ScoredRoom[] {
  type IntelGlobal = typeof global & {
    intel?: Record<string, RoomIntel>;
    setIntelDirty: () => void;
  };
  const globalObj = global as IntelGlobal;

  if (!globalObj.intel) {
    return [];
  }

  const scoredRooms: ScoredRoom[] = [];

  // Cache typed view of the intel map to avoid implicit any errors
  const intelMap: Record<string, RoomIntel> = globalObj.intel ?? ({} as Record<string, RoomIntel>);

  // Score all viable rooms
  for (const [roomName, intel] of Object.entries(intelMap)) {
    if (!intel || !isRoomViable(intel)) {
      continue;
    }

    // Skip rooms that are already assigned to a different home room
    if (intel.homeRoom && intel.homeRoom !== homeRoomName) {
      continue;
    }

    // Skip stale intel
    if (Game.time - intel.lastScouted > 10000) {
      continue;
    }

    const score = calculateRoomScore(roomName, intel, homeRoomName);
    scoredRooms.push({
      roomName,
      intel,
      score,
      homeRoom: homeRoomName,
    });
  }

  // Sort by score (highest first) and return top targets
  const topRooms = scoredRooms.sort((a, b) => b.score - a.score).slice(0, maxTargets);

  if (topRooms.length > 0) {
    Logger.info(`[ExpansionPlanner] Top expansion targets for ${homeRoomName}:`);
    topRooms.forEach((room, index) => {
      Logger.info(`  ${index + 1}. ${room.roomName} (score: ${room.score.toFixed(1)})`);
    });
  }

  return topRooms;
}

export function shouldClaimRoom(): boolean {
  // Only claim if we have GCL capacity
  const currentRoomCount = Object.keys(Game.spawns).length;
  return Game.gcl.level > currentRoomCount;
}

export function getExpansionAction(roomName: string): 'claim' | 'reserve' | 'none' {
  type IntelGlobal = typeof global & {
    intel?: Record<string, RoomIntel>;
    setIntelDirty: () => void;
  };
  const globalObj = global as IntelGlobal;
  const intel = globalObj.intel?.[roomName] as RoomIntel | undefined;
  if (!intel || !isRoomViable(intel)) {
    return 'none';
  }

  // Check if we should claim this room
  if (shouldClaimRoom()) {
    // Only claim rooms with 2+ sources for efficiency
    if (intel.sources.length >= 2) {
      return 'claim';
    }
  }

  // Default to reserve for remote mining
  return 'reserve';
}
