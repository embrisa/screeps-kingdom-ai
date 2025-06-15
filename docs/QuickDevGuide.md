# Developer Quick-Start Guide – Screeps Kingdom AI

Welcome to the kingdom!  This document is a **30-minute crash course** that will bring any developer up to speed on the architecture, tooling, and conventions used in this repository.  When in doubt, consult `docs/ImplementationPlan.md` for the long-form roadmap – this file is the concise complement focused on day-to-day implementation details.

---

## 1. Project Vision in 60 Seconds

* **Goal:** Build an autonomous, multi-shard empire that can defend, expand, trade, and optimise itself with minimal human oversight.
* **Strategy:** Incremental milestones (Phases 0-6) that each deliver a deployable, self-sufficient AI while layering new capabilities.
* **Status:** **Early alpha** – a single-room colony (RCL 3) runs reliably on the **local** dev server. Everything beyond one room or GCL 3 is still unexplored on an online shard.

---

## 2. Repository Layout

```
├── docs/                # All design docs & guides  ← you are here
├── src/                 # Game code (TypeScript)
│   ├── roles/           # Creep role implementations
│   ├── managers/        # Room-level or empire-level managers
│   ├── utils/           # Re-usable helper libraries
│   ├── __tests__/       # Jest unit / integration tests
│   ├── main.ts          # Game loop entry point
│   └── types.d.ts       # Memory & global type declarations
├── dist/                # Rollup bundle output (ignored)
├── rollup.config.js     # Build configuration
├── package.json         # NPM scripts & dependencies
└── tsconfig.json        # TypeScript compiler options
```

### Key Conventions

1. **Pure ES Modules** – We bundle to CommonJS only at build time.
2. **Strict Typing** – `"strict": true` in `tsconfig.json` (zero `any`).
3. **One Role ≙ One File** – Easier profiling & hot-swapping.
4. **Manager Pattern** – Each high-level concern (spawning, defence, stats …) has a dedicated manager that is tick-driven from `main.ts`.

---

## 3. Tooling & NPM Scripts

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies (Node ≥ 16). |
| `npm run build` | Compile TypeScript → `dist/main.js` via Rollup. |
| `npm test` | Run Jest unit tests. |
| `npm run lint` | ESLint + Prettier check. |
| `npm run sim:init` | Initialise a local Screeps server (first time). |
| `npm run sim` | Start local server at 100 ticks/s for fast iteration. |
| `npm run push` | Upload latest bundle to an online shard (requires `.env`). |

> Tip: Add `export SCREEPS_BRANCH=dev` to push to a non-default branch for testing.

---

## 4. Game Loop ( `src/main.ts` )

```ts
export function loop(): void {
  try {
    profiler.wrap(() => {
      // 1. Housekeeping (memory cleanup, stats reset)
      houseKeeper.run();

      // 2. Per-room logic
      for (const room of Object.values(Game.rooms)) {
        spawnManager.run(room);
        defenseManager.run(room);
        towerManager.run(room);
        remoteManager.run(room);
        roomPlanner.run(room);
        statsManager.collect(room);
      }

      // 3. Per-creep logic
      for (const creep of Object.values(Game.creeps)) {
        const role = roles[creep.memory.role];
        role.run(creep);
      }
    });
  } catch (err) {
    Logger.error(`Loop crashed: ${err}`);
  }
}
```

* **Profiler** – CPU usage per function, results in `Memory.profiler.*`.
* **StatsManager** – Collects metrics into `Memory.stats` each tick.

---

## 5. Core Modules

### 5.1 Managers

| Manager | Responsibility | Highlights |
|---------|----------------|------------|
| **SpawnManager** (`src/spawnManager.ts`) | Maintain creep population for every role. | Dynamic body sizes via `utils/bodyGenerator.ts`; prioritises spawn uptime. |
| **TowerManager** (`src/towerManager.ts`) | Target selection, healing, and structural repairs. | Focus-fire algorithm & energy gating. |
| **DefenseManager** (`src/defenseManager.ts`) | Threat assessment, safe-mode, defender spawn queue. | 5-tier threat levels, breach-time calc, Game.notify alerts. |
| **RemoteManager** (`src/remoteManager.ts`) | Oversees expansion, remote mining, and logistics. | CPU & resource gating (`canExpand()`), highway planner. |
| **RoomPlanner** (`src/roomPlanner.ts`) | Container / road placement & layout memory. | Swamp avoidance, memory-based caching. |
| **StatsManager** (`src/statsManager.ts`) | Aggregates economic & CPU metrics. | Compatible with external Grafana dashboard. |

### 5.2 Roles (Creep Behaviours)

* **Economy** – `harvester`, `staticHarvester`, `hauler`, `upgrader`, `builder`, `repairer`.
* **Remote Ops** – `pioneer`, `reserver`, `remoteHarvester`, `remoteHauler`, `remoteDefender`, `scout`.
* **Combat** – `defender` (ranged kite); future `sieger` & `dismantler`.
* Each role implements `BaseRole.run(creep)` from `src/roles/base.ts`.

### 5.3 Utilities

| File | Purpose |
|------|---------|
| `utils/bodyGenerator.ts` | Generate optimal creep bodies per role & energy budget. |
| `utils/profiler.ts` | Lightweight profiler (CPU start/stop). |
| `utils/movement.ts` | High-level pathing helpers with stuck detection. |
| `utils/pathCache.ts` | Global LRU cache around `PathFinder.search` (structure-aware invalidation). |
| `utils/Logger.ts` | Adjustable log verbosity via `Memory.logLevel`. |
| `utils/constants.ts` | Project-wide enums & numeric constants.

---

## 6. Memory Schema & Types

Located in `src/types.d.ts` (plus `src/defense.d.ts`).  Key namespaces:

```ts
declare global {
  interface Memory {
    creeps: { [name: string]: CreepMemory };
    rooms: { [roomName: string]: RoomMemory };
    intel: { [roomName: string]: RoomIntel };  // stored in RawMemory.segment 90
    stats: MemoryStats;
  }

  interface CreepMemory { role: RoleName; homeRoom: string; ... }
  interface RoomMemory { threatLevel: ThreatLevel; safeModeQueued?: boolean; ... }
}
```

* **Strictly typed** – No `any`.  Extending?  Add to the appropriate interface.
* **Segments** – Heavy-weight intel is **not** in global `Memory`; see `remoteManager`.

---

## 7. Testing & CI

* **Jest** – Runs in Node with `@screeps/common` stubs; see `src/__tests__/*`.
* **Sample Cases** – Body generator sizing, role state transitions, path-cache eviction.
* **Continuous Integration** – (Planned) GitHub Actions: `npm ci`, `npm run lint`, `npm test`, `npm run build`.

---

## 8. Coding Standards

1. **ESLint** – Auto-fixed on commit via `husky` + `lint-staged`.
2. **Prettier** – 100-char line width, single quotes.
3. **Commit Messages** – Conventional commits (`feat:`, `fix:`, `docs:` …) for changelog generation.
4. **Pull Requests** – Must satisfy Definition of Done (see ImplementationPlan Appendix).

---

## 9. Contributing Workflow

```bash
# 1. Clone & install
$ git clone <repo>
$ cd Screeps
$ nvm use # Node 16
$ npm install

# 2. Run local simulation in another terminal
$ npm run sim:init   # first time only
$ npm run sim

# 3. Develop
$ npm run watch      # auto-rebuild on change

# 4. Test & lint
$ npm test && npm run lint

# 5. Push to a test branch on a live shard
$ npm run push       # requires .env with SCREEPS_TOKEN
```

---

## 10. Roadmap Snapshot (Where We Are)

| Phase | Status | Focus |
|-------|--------|-------|
| 0 – Environment | ✅ | Local dev & build pipeline |
| 1 – MVP Economy | ✅ (local) | Single-room RCL 3 colony |
| 2 – Infrastructure | 🛠️ | Container mining & Roads (coded; untested live) |
| 3 – Multi-room | ⏳ | Remote mining & Intel (unexplored) |
| 4 – Defence | ⏳ | Tower AI, Threat assessment (unexplored) |
| 5 – Market | ⏳ | Terminal trade, Power processing |
| 6 – ML / Optimise | ⏳ | Continuous tuning |

---

## 11. FAQ

**Q:** _The AI isn't spawning creeps._  
**A:** Check `Memory.cpuCaution`, storage energy, and spawnManager logs (log level ≥ 2).

**Q:** _Pathing is weird / creeps stuck._  
**A:** Inspect `Memory.pathCacheMetrics.hitRate`, ensure PathCache invalidation is working.

**Q:** _How do I force safe mode?_  
**A:** `Memory.rooms[roomName].safeModeQueued = true` – DefenseManager handles the rest.

---

## 12. Useful One-Liners

```js
// Toggle debug logs for a module
type Memory.logLevel = 0 | 1 | 2 | 3; // 0 = silent
Memory.logLevel = 2;

// Inspect stats via console
console.log(JSON.stringify(Memory.stats, null, 2));

// Clear obsolete creep memory
for (const name in Memory.creeps) if (!Game.creeps[name]) delete Memory.creeps[name];
```

---

## 13. Next Steps for New Contributors

1. **Read** the section of the code you're modifying (manager/role/util).
2. **Write** or update tests in `__tests__` (mock creeps & rooms).
3. **Run** local sim and confirm no new ESLint errors.
4. **Submit** a well-scoped PR referencing the relevant Phase task.

Welcome aboard, commander – may your CPU bucket overflow and your ramparts stand tall! 🚀 