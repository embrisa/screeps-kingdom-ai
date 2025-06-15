import { Logger } from './utils/Logger';
import { findPathWithCache, invalidateRoomCache } from './utils/pathCache';
import { RoomIntel } from './types';

const CONTAINER_CONSTRUCTION_DELAY = 1000;
const HIGHWAY_PLAN_DELAY = 2500;
const MIN_RCL_FOR_CONTAINERS = 2;
const MIN_RCL_FOR_ROADS = 3;

function planSourceContainers(room: Room): void {
    if ((room.controller?.level ?? 0) < MIN_RCL_FOR_CONTAINERS) {
        return;
    }

    const sources = room.find(FIND_SOURCES);
    sources.forEach((source) => {
        const nearbyContainers = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: (s) => s.structureType === STRUCTURE_CONTAINER,
        });
        const nearbySites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
            filter: (s) => s.structureType === STRUCTURE_CONTAINER,
        });

        if (nearbyContainers.length === 0 && nearbySites.length === 0) {
            Logger.info(`[Planner] No container for source ${source.id} in ${room.name}. Planning one.`);
            const controllerPos = room.controller?.pos;
            if (!controllerPos) return; // safety check, though controller should exist
            const path = room.findPath(source.pos, controllerPos, { ignoreCreeps: true, range: 1 });
            if (path.length > 0) {
                const pos = new RoomPosition(path[0].x, path[0].y, room.name);
                room.createConstructionSite(pos, STRUCTURE_CONTAINER);
            }
        }
    });
}

function planIntraRoomRoads(room: Room): void {
    if ((room.controller?.level ?? 0) < MIN_RCL_FOR_ROADS) return;
    if (!Memory.roomPlans) Memory.roomPlans = {};
    if (!Memory.roomPlans[room.name]) Memory.roomPlans[room.name] = { paths: {} };

    const keypoints: RoomPosition[] = [];
    if (room.controller) keypoints.push(room.controller.pos);
    room.find(FIND_SOURCES).forEach((s) => keypoints.push(s.pos));

    for (let i = 0; i < keypoints.length; i++) {
        for (let j = i + 1; j < keypoints.length; j++) {
            const from = keypoints[i];
            const to = keypoints[j];
            const pathKey = `${from.x},${from.y}-${to.x},${to.y}`;

            if (!Memory.roomPlans[room.name].paths[pathKey]) {
                const pathResult = findPathWithCache(from, to, { swampCost: 1 });
                if (pathResult && !pathResult.incomplete) {
                    Memory.roomPlans[room.name].paths[pathKey] = pathResult.path.map((p) => ({
                        x: p.x,
                        y: p.y,
                    }));
                }
            }
        }
    }
}

function planHighways(room: Room): void {
    type IntelGlobal = typeof global & { intel?: Record<string, RoomIntel> };
    const globalObj = global as IntelGlobal;

    if (!globalObj.intel || !room.storage) return;

    const remoteRooms = Object.entries(globalObj.intel).filter(
        ([, intel]) => intel && intel.homeRoom === room.name,
    );

    for (const [remoteName, intelData] of remoteRooms) {
        const intel = intelData as RoomIntel;
        if (!intel || !intel.sources || intel.sources.length === 0) continue;

        const highwayId = `${room.name}-${remoteName}`;
        if (Memory.highways && Memory.highways[highwayId]) continue;

        const origin = room.storage.pos;
        const destination = new RoomPosition(
            intel.sources[0].pos.x,
            intel.sources[0].pos.y,
            remoteName,
        );

        const route = Game.map.findRoute(origin.roomName, destination.roomName, {
            routeCallback(roomName) {
                const roomIntel = globalObj.intel?.[roomName];
                if (roomIntel?.hostile) return Infinity;
                return 1;
            },
        });

        if (route === -2 || route.length === 0) {
            Logger.warn(`[Highway] No route found from ${origin.roomName} to ${destination.roomName}`);
            continue;
        }

        const pathResult = PathFinder.search(
            origin,
            { pos: destination, range: 1 },
            {
                plainCost: 2,
                swampCost: 10,
                roomCallback: (roomName) => {
                    const roomIntel = globalObj.intel?.[roomName];
                    if (roomIntel?.hostile) return false;
                    const room = Game.rooms[roomName];
                    if (!room) return new PathFinder.CostMatrix();
                    const costs = new PathFinder.CostMatrix();
                    room.find(FIND_STRUCTURES).forEach((s) => {
                        if (s.structureType === STRUCTURE_ROAD) costs.set(s.pos.x, s.pos.y, 1);
                        else if (
                            s.structureType !== STRUCTURE_CONTAINER &&
                            (s.structureType !== STRUCTURE_RAMPART || !s.my)
                        ) {
                            costs.set(s.pos.x, s.pos.y, 0xff);
                        }
                    });
                    return costs;
                },
            },
        );

        if (!pathResult.incomplete) {
            Logger.info(`[Highway] Planned highway ${highwayId} with ${pathResult.path.length} steps.`);
            if (!Memory.highways) Memory.highways = {};
            Memory.highways[highwayId] = {
                path: pathResult.path.map((p) => ({ x: p.x, y: p.y, roomName: p.roomName })),
                createdAt: Game.time,
            };
        }
    }
}

function buildRoads(): void {
    // Build intra-room roads
    if (Memory.roomPlans) {
        for (const roomName in Memory.roomPlans) {
            const room = Game.rooms[roomName];
            if (!room || !room.controller?.my) continue;

            const plan = Memory.roomPlans[roomName];
            Object.values(plan.paths).forEach((path) => {
                path.forEach((pos) => {
                    const roomPos = new RoomPosition(pos.x, pos.y, roomName);
                    if (
                        !roomPos.lookFor(LOOK_STRUCTURES).some((s) => s.structureType === STRUCTURE_ROAD) &&
                        !roomPos
                            .lookFor(LOOK_CONSTRUCTION_SITES)
                            .some((s) => s.structureType === STRUCTURE_ROAD)
                    ) {
                        room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                    }
                });
            });
        }
    }

    // Build highways
    if (Memory.highways) {
        for (const highwayId in Memory.highways) {
            const highway = Memory.highways[highwayId];
            highway.path.forEach((pos) => {
                const room = Game.rooms[pos.roomName];
                if (!room) return; // Can only build in visible rooms

                const roomPos = new RoomPosition(pos.x, pos.y, pos.roomName);
                if (
                    !roomPos.lookFor(LOOK_STRUCTURES).some((s) => s.structureType === STRUCTURE_ROAD) &&
                    !roomPos.lookFor(LOOK_CONSTRUCTION_SITES).some((s) => s.structureType === STRUCTURE_ROAD)
                ) {
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                }
            });
        }
    }

    // Build roads from the highway cache
    if (!Memory.highways) return;

    for (const highway of Object.values(Memory.highways)) {
        for (const pos of highway.path) {
            const roomName = pos.roomName;
            const targetRoom = Game.rooms[roomName];
            if (!targetRoom || !targetRoom.controller?.my) continue;

            const position = new RoomPosition(pos.x, pos.y, roomName);
            const existingStructure = position
                .lookFor(LOOK_STRUCTURES)
                .find((s) => s.structureType === STRUCTURE_ROAD);
            const existingConstructionSite = position
                .lookFor(LOOK_CONSTRUCTION_SITES)
                .find((s) => s.structureType === STRUCTURE_ROAD);

            if (!existingStructure && !existingConstructionSite) {
                const result = targetRoom.createConstructionSite(position, STRUCTURE_ROAD);
                if (result === OK) {
                    Logger.debug(`[Highway] Queued road construction at ${position}`);
                }
            }
        }
    }
}

function detectStructureChanges(room: Room): void {
    // Track structure count to detect when new structures are built
    if (!Memory.roomPlans) Memory.roomPlans = {};
    if (!Memory.roomPlans[room.name]) Memory.roomPlans[room.name] = { paths: {} };

    const roomPlan = Memory.roomPlans[room.name];
    const currentStructureCount = room.find(FIND_STRUCTURES).length;

    if (
        roomPlan.lastStructureCount !== undefined &&
        roomPlan.lastStructureCount !== currentStructureCount
    ) {
        Logger.debug(`[PathCache] Structure count changed in ${room.name}, invalidating path cache`);
        invalidateRoomCache(room.name);
    }

    roomPlan.lastStructureCount = currentStructureCount;
}

export function runRoomPlanner(room: Room): void {
    // Check for structure changes that would invalidate cached paths
    if (room.controller?.my) {
        detectStructureChanges(room);
    }

    if (Game.time % CONTAINER_CONSTRUCTION_DELAY === 0) {
        Logger.debug(`[Planner] Running container/road plan for room ${room.name}...`);
        if (room.controller?.my) {
            planSourceContainers(room);
            planIntraRoomRoads(room);
        }
    }

    if (Game.time % HIGHWAY_PLAN_DELAY === 0) {
        Logger.debug(`[Planner] Running highway plan for room ${room.name}...`);
        if (room.controller?.my) {
            planHighways(room);
        }
    }

    // Road building should happen more frequently
    if (Game.time % 100 === 0) {
        buildRoads();
    }
}
