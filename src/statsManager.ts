import { Logger } from './utils/Logger';
import { RoomStats, StatsMemory, RoomIntel } from './types';
import _ from 'lodash';

// Strongly-typed view of the augmented global object
type IntelGlobal = typeof global & { intel?: Record<string, RoomIntel> };

class StatsManager {
    private readonly STATS_LOG_INTERVAL = 1000;

    public run(): void {
        if (!Memory.stats) {
            this.initializeStats();
        }
        const stats = Memory.stats as StatsMemory;

        // Collect global stats
        stats.gcl = Game.gcl;
        stats.gpl = Game.gpl;
        stats.cpu = {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Game.cpu.getUsed(),
        };
        stats.creeps = _.countBy(Game.creeps, (c: Creep) => c.memory.role);

        // Collect room stats
        this.collectRoomStats(stats);

        // Collect remote operation stats
        collectRemoteStats(stats);

        // Optional logging
        if (Game.time % 500 === 0) {
            logRemoteOperationsStats();
        }

        if (Game.time % this.STATS_LOG_INTERVAL === 0) {
            Logger.debug(`Stats collected. GCL: ${stats.gcl.level}, CPU Bucket: ${stats.cpu.bucket}`);
        }
    }

    private initializeStats(): void {
        Memory.stats = {
            gcl: { level: 0, progress: 0, progressTotal: 0 },
            gpl: { level: 0, progress: 0, progressTotal: 0 },
            cpu: { bucket: 0, limit: 0, used: 0 },
            creeps: {},
            rooms: {},
        };
    }

    private collectRoomStats(stats: StatsMemory): void {
        stats.rooms = {};
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!room.controller?.my) continue;

            const roomStats: RoomStats = {};

            if (room.controller) {
                roomStats.controller = {
                    level: room.controller.level,
                    progress: room.controller.progress,
                    progressTotal: room.controller.progressTotal,
                    ticksToDowngrade: room.controller.ticksToDowngrade,
                };
            }

            roomStats.energy = {
                available: room.energyAvailable,
                capacity: room.energyCapacityAvailable,
            };

            if (room.storage) {
                roomStats.storage = {
                    energy: room.storage.store.getUsedCapacity(RESOURCE_ENERGY),
                    total: room.storage.store.getUsedCapacity(),
                };
            }

            const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
            if (constructionSites.length > 0) {
                roomStats.construction = {
                    count: constructionSites.length,
                    progress: _.sumBy(constructionSites, 'progress'),
                    progressTotal: _.sumBy(constructionSites, 'progressTotal'),
                };
            }

            stats.rooms[roomName] = roomStats;
        }
    }
}

export const statsManager = new StatsManager();

function collectRemoteStats(stats: StatsMemory): void {
    // Initialize remote stats if not present
    if (!stats.remote) {
        stats.remote = {
            activeRooms: 0,
            totalHighways: 0,
            energyHauled: 0,
            remoteCreepCount: 0,
            averageDistance: 0,
        };
    }

    // Count active remote rooms
    const globalObj = global as IntelGlobal;
    const activeRemoteRooms = globalObj.intel
        ? Object.values(globalObj.intel).filter(
            (intel) => intel && intel.homeRoom && Game.time - intel.lastScouted < 10000,
        ).length
        : 0;

    // Count highways
    const totalHighways = Memory.highways ? Object.keys(Memory.highways).length : 0;

    // Count remote creeps
    const remoteCreeps = Object.values(Game.creeps).filter(
        (creep) =>
            creep.memory.role.startsWith('remote') ||
            creep.memory.role === 'reserver' ||
            creep.memory.role === 'pioneer',
    );

    // Calculate average distance to remote rooms
    let totalDistance = 0;
    let roomCount = 0;
    if (globalObj.intel) {
        for (const [roomName, intel] of Object.entries(globalObj.intel)) {
            if (intel && intel.homeRoom) {
                const distance = Game.map.getRoomLinearDistance(roomName, intel.homeRoom, false);
                totalDistance += distance;
                roomCount++;
            }
        }
    }

    stats.remote.activeRooms = activeRemoteRooms;
    stats.remote.totalHighways = totalHighways;
    stats.remote.remoteCreepCount = remoteCreeps.length;
    stats.remote.averageDistance = roomCount > 0 ? totalDistance / roomCount : 0;

    // Track energy hauled (estimate based on remote hauler capacity)
    const remoteHaulers = remoteCreeps.filter((c) => c.memory.role === 'remoteHauler');
    let estimatedEnergyHauled = 0;
    remoteHaulers.forEach((hauler) => {
        if (hauler.memory.homeRoom && hauler.room.name === hauler.memory.homeRoom) {
            // Hauler is delivering, estimate energy delivered
            estimatedEnergyHauled += hauler.store.getUsedCapacity(RESOURCE_ENERGY);
        }
    });
    stats.remote.energyHauled = estimatedEnergyHauled;
}

function logRemoteOperationsStats(): void {
    const remoteStats = Memory.stats?.remote;
    if (remoteStats) {
        Logger.info(
            `[Remote] Active rooms: ${remoteStats.activeRooms}, Highways: ${remoteStats.totalHighways}, Remote creeps: ${remoteStats.remoteCreepCount}`,
        );
        Logger.info(
            `[Remote] Avg distance: ${remoteStats.averageDistance.toFixed(1)}, Energy hauled this tick: ${remoteStats.energyHauled}`,
        );
    }
}
