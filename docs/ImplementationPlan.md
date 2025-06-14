# Implementation Plan – Screeps Kingdom AI

> "A goal without a plan is just a wish." — Antoine de Saint-Exupéry

This document breaks down **every major step** required to evolve this codebase from an empty repository into a resilient, multi-shard empire.  Each phase contains:

* Objectives – the high-level purpose of the phase.
* Prerequisites – what must already be true before starting.
* Work Breakdown Structure (WBS) – ordered tasks and sub-tasks.
* Deliverables & Acceptance Criteria – how we know we're done.
* Metrics / Telemetry – quantitative targets to measure success.

Estimated timelines assume ~5–8 focused hours per week by a solo developer.  Adjust as capacity changes.

---

## Milestone Roadmap (Bird's-Eye)

| Phase | Target RCL | Estimated Duration | Core Modules Completed |
|-------|------------|--------------------|-----------------------|
| 0. Environment Setup | — | 1 week | Tooling, test harness, build pipeline |
| 1. Bootstrapping MVP | 2 | 1–2 weeks | Harvester, Upgrader, Builder, Spawn Manager |
| 2. Infrastructure Growth | 3-5 | 2–3 weeks | Energy logistics, Road planner, Dynamic body generator |
| 3. Multi-room Expansion | 6-7 | 3–4 weeks | Claim/Reserve logic, Remote mining, Cross-room hauling |
| 4. Defense & Warfare | 7-8 | 2–3 weeks | Tower AI, Combat roles, Threat assessment |
| 5. Market & Power | 8 | 2 weeks | Market bot, Power processing, Labs |
| 6. Optimization & ML | 8+ | Ongoing | Telemetry dashboards, evolutionary tuning |

> NOTE: Phases are **incremental** – each delivers a stable, playable AI that can be deployed before the next begins.

---

## Phase 0 – Local Environment Setup

### Objectives
1. Establish a frictionless local dev workflow.
2. Ensure local build, lint and test commands run reliably.

### Prerequisites
* Node.js ≥ 18 installed.
* Screeps account + API token ready.

### Work Breakdown Structure
1. **Repo Bootstrapping**
   1. Initialize Git repository, commit `README.md` & license, then create and push to a GitHub repository.
   2. Configure `.gitignore` for `dist/`, `node_modules/`, secrets.
2. **Package Management**
   1. Run `npm init -y` → baseline `package.json`.
   2. Add `typescript`, `ts-node`, `@types/screeps`, `eslint`, `prettier`, `jest`, `ts-jest`, `husky`, `lint-staged`.
3. **TypeScript Setup**
   1. Generate `tsconfig.json` with `"strict": true` and `es2021` target.
   2. Create `src/` folder and placeholder `main.ts` with empty game loop.
4. **Build & Bundle**
   1. Install `webpack`, `ts-loader`, `screeps-webpack-plugin`.
   2. Author `webpack.config.js` that outputs to `dist/` and handles Screeps globals.
   3. Add `screeps` server package (`npm i -D screeps@4.2.19`) for local simulation.
   4. Configure **external commit** workflow:
      * Install [`grunt-screeps`](https://www.npmjs.com/package/grunt-screeps) (`npm i -D grunt-screeps`) **or** use the bundled `screeps-api` CLI (already provided in `package.json` as `npm run push`).
      * If using Grunt: create `Gruntfile.js` per the [official docs](https://docs.screeps.com/commit.html#using-grunt-task) pointing to the compiled `dist` folder.
      * If using CLI: keep `.env` variables `SCREEPS_TOKEN`, `SCREEPS_BRANCH` and run `npm run push` to upload `dist/*.js` via Web API.
5. **Coding Standards**
   1. Add ESLint config extending `eslint:recommended`, `@typescript-eslint` rules.
   2. Configure Prettier with 100-char line width and single quotes.
   3. Hook `husky` pre-commit → `lint-staged` for fast lint/format.
6. **Testing Harness**
   1. Configure Jest with `ts-jest` preset.
   2. Add example unit test (`src/__tests__/sample.test.ts`).
7. **Secrets Management**
   1. Add `.env.example` with `SCREEPS_EMAIL`, `SCREEPS_TOKEN`, `SCREEPS_BRANCH`.
   2. Document `cp .env.example .env` step in README.

### Deliverables & Acceptance Criteria
* `npm run lint`, `npm test`, `npm run build` succeed locally.
* `npm run push` (or `grunt screeps`) successfully uploads code to the target Screeps branch.
* No TypeScript errors in empty loop.

### Metrics / Telemetry
* Local build success rate ≥ 95%.

---

## Phase 1 – Bootstrapping MVP (RCL 2)

### Objectives
1. Achieve a **self-sustaining economy** in a single room up to controller level 2.
2. Maintain constant spawn uptime with 3 basic creep roles.

### Prerequisites
* Phase 0 completed (local build, lint, tests all green).
* Private Screeps server running for rapid simulation (`npm run sim:init` then `npm run sim`).

### Work Breakdown Structure
1. **Memory Schema Definition**
   * Author `src/types.d.ts` with strongly-typed `Memory`, `CreepMemory`, `RoomMemory`.
2. **Role Framework**
   * Implement base `Role` interface with `run(creep: Creep)`.
   * Add profiler utility to measure CPU per role.
3. **Role: Harvester**
   * Logic: fetch from source → transfer to spawn/extensions.
   * Edge cases: no container, full storage, dying creep `ticksToLive < 50`.
4. **Role: Upgrader**
   * Withdraw energy → upgrade controller.
   * Pull from container/storage once built.
5. **Role: Builder**
   * Priorities: spawn → extension → road → container → others.
6. **Spawn Manager**
   * Decide active creep counts per role based on available energy and room state.
   * Include body generator for (WORK, CARRY, MOVE) budget ≤ room energy capacity.
7. **Task Queue (optional)**
   * Simple FIFO queue in Memory for construction tasks.
8. **First Jest Tests**
   * Unit-test body generator sizing & cost calculation.
   * Mock creep objects to test role state transitions.
9. **Telemetry**
   * Log energy income / tick and spawn uptime to `Memory.stats`.

### Deliverables & Acceptance Criteria
* Room reaches RCL 2 autonomously ≤ 10,000 ticks from empty start.
* Spawn energy never drops below 200 for > 50 consecutive ticks once stable.
* CPU usage < 15% on official shard performance baseline.

### Metrics / Telemetry
* Energy harvested per tick ≥ 300 by RCL 2.
* Average spawn idle ticks ≤ 5.

---

## Phase 2 – Infrastructure Growth (RCL 3-5)

### Objectives
1. Accelerate controller upgrading and resource flow.
2. Lay down roads & containers to reduce creep fatigue.

### Prerequisites
* Phase 1 stable in production shard.

### Work Breakdown Structure
1. **Dynamic Body Generator v2**
   * Optimize bodies per role based on room `energyCapacityAvailable` and distance heuristics.
2. **Road Planner**
   * Dijkstra between sources ↔ spawn/controller and persist path in `Memory.roomPlans`.
   * Queue `ConstructionSite` placements automatically.
3. **Container Strategy**
   * Auto-place containers at each source & near controller.
   * Implement `staticHarvester` role (WORK×5 + CARRY×1 + MOVE×1) for each container.
4. **Link Network (RCL 5)**
   * Detect link availability; create `linkManager` to push energy from source links → controller link.
5. **Pathfinder Cache**
   * Wrap `PathFinder.search` with global LRU cache keyed by origin/destination/room terrain version.
6. **Role: Hauler**
   * Ferry energy from containers to spawn/extensions if no links.
   * Use `CARRY`-heavy bodies sized dynamically.
7. **Room Metrics Dashboard**
   * Push `roomEnergyAvg`, `upgradePower`, `constructionProgress` to `Memory.stats` for Grafana.

### Deliverables & Acceptance Criteria
* Controller hits RCL 5 without manual intervention.
* Average creep travel time reduced ≥ 25% (measured via stored ticks per trip).
* Path cache hit rate ≥ 70%.

### Metrics / Telemetry
* Energy throughput ≥ 1,500 / tick at RCL 5.
* CPU cost of pathfinding < 2 / tick on average.

---

## Phase 3 – Multi-room Expansion (RCL 6-7)

### Objectives
1. Claim or reserve adjacent rooms while maintaining core economy.
2. Introduce long-distance logistics and defense for outposts.

### Prerequisites
* Phase 2 deployed; surplus energy ≥ 2,000 / tick.

### Work Breakdown Structure
1. **Scout Role**
   * Periodically visit nearby rooms, record sources, minerals, controllers, hostile presence.
2. **Intel Database**
   * Store `RoomIntel` in global `Memory.intel` keyed by room name.
3. **Claim Planner**
   * Choose next room based on range, remote source count, threat level.
4. **Role: Claimer**
   * Spawn with `CLAIM` body parts to reserve/claim.
5. **Remote Mining**
   * For each remote source → spawn `remoteHarvester` + `remoteHauler`.
   * Use `Route.optimism` to find CPU-cheap paths.
6. **Cross-room Link / Highway Road**
   * Build highways using road planner between core ↔ remotes.
7. **Defensive Patrol**
   * Lightweight `Patroller` role circles remote rooms to detect invaders.
8. **Shard-level Memory Refactor**
   * Namespaces: `Memory.rooms`, `Memory.squads`, `Memory.flags`.
9. **Staging & Failover**
   * If GCL full, skip claim and allocate CPU to upgrading.

### Deliverables & Acceptance Criteria
* 2–3 additional rooms controlled or reserved within 30,000 ticks of phase start.
* Remote mining adds ≥ 1,000 energy / tick net after travel cost.
* Early warning when hostile creeps enter owned/remote rooms (console + email alert).

### Metrics / Telemetry
* Energy haul distance cost ≤ 0.3 CPU per 100 units.
* Remote creep survivability ≥ 90% (deaths / spawned).

---

## Phase 4 – Defense & Warfare (RCL 7-8)

### Objectives
1. Defend borders automatically; retaliate if opportunities arise.
2. Maintain peace-time CPU usage; only scale up when under threat.

### Prerequisites
* Phase 3 complete; walls and ramparts erected in core rooms.

### Work Breakdown Structure
1. **Threat Assessment Module**
   * Analyze hostiles: body composition, boosted parts, intent (harass vs siege).
2. **Tower AI**
   * Prioritize healers > ranged attackers > melee > structures.
   * Use room energy threshold to decide repair vs attack vs idle.
3. **Safe Mode Logic**
   * Trigger on breach probability > 70%, auto-generate alert.
4. **Combat Creep Composer**
   * Function `composeCombatBody(role, budget, boost)` returns optimal body array.
5. **Squad Framework**
   * Group creeps into squads with shared objectives (e.g., `DefendRoomA`).
6. **Role: Defender (Ranged / Melee)**
   * Kite algorithm using `Flee` pathfinding, focus-fire.
7. **Boost Management**
   * Manage labs to boost combat creeps with `XKHO2`, `XKCR`, etc.
8. **Siege Capability (Optional)**
   * Implement `Sieger` role for rampart dismantle and tower draining.

### Deliverables & Acceptance Criteria
* Automated response repels common invasions (< 3 creeps) without manual code changes.
* Core room walls sustain DPS ≥ 10,000 while towers fire.
* No uncontrolled structure loss in 2-week simulation war games.

### Metrics / Telemetry
* Average tower reaction time ≤ 2 ticks.
* Successful defense rate ≥ 95% of simulated raids.

---

## Phase 5 – Market & Power (RCL 8)

### Objectives
1. Monetize surplus energy/minerals via `Game.market`.
2. Harness power for global control points and power creeps.

### Prerequisites
* Phase 4 stable; storage regularly > 5m energy.

### Work Breakdown Structure
1. **Market Bot**
   * Implement linear regression on historical prices → decide buy/sell orders.
   * Cancel or adjust orders if margin falls below threshold.
2. **Terminal Logistics**
   * Balance resource levels across rooms; throttle send based on `Game.cpu.bucket`.
3. **Power Harvesting**
   * Detect power bank spawns via observer; spawn `powerHarvestSquad` (healer + dismantler).
4. **Power Spawn Operations**
   * Build power spawn, feed 50-power + 50-k energy cycles.
5. **Power Creep Design**
   * Initial Power Creep: `Operator` with `OPERATE_CONTROLLER`, `OPERATE_STORAGE`.
6. **Lab Automation**
   * Manage 10-lab reaction chains → boost stockpiles + sale commodities.

### Deliverables & Acceptance Criteria
* Generate ≥ 50 credits / tick profit average over 3 days.
* First power creep spawned and actively reducing upgrade cost.

### Metrics / Telemetry
* Market order adjustment success ratio ≥ 80% (vs min profit target).
* Power processed per day ≥ 1,000.

---

## Phase 6 – Optimization & Machine Learning (Ongoing)

### Objectives
1. Continuously refine strategies using data-driven approaches.
2. Minimize CPU while maximizing empire GCL/GPL growth.

### Work Breakdown Structure
1. **Telemetry Pipeline**
   * Export `Memory.stats` → InfluxDB → Grafana dashboards.
2. **Evolutionary Strategy Tuning**
   * GA to tweak constants (creep ratio, emergency thresholds) offline.
3. **Replay Analyzer**
   * Parse replay files; label events (invasion, shortage) to train models.
4. **CPU Micro-optimizations**
   * Profiling sessions; memoization; segment caching.
5. **Shard Coordination**
   * When multi-shard, share intel via `Inter-Shard Memory` & segment compression.
6. **Community Benchmarking**
   * Run against open-source AIs in private servers; record win/loss.

### Deliverables & Acceptance Criteria
* 10% CPU reduction in baseline tick after optimizations.
* Automated nightly GA run suggests parameter deltas; human review merges profitable ones.

### Metrics / Telemetry
* Average CPU usage ≤ 60% bucket drain.
* GCL gain per CPU ≥ 1.5 (relative metric).

---

## Definition of Done (Per Task)
1. Code merged into `main` via GitHub Pull Request with all tests, linting and CI workflows passing.
2. Unit / integration tests written and green.
3. Updated documentation (`README` or relevant `.md`).
4. Logged evidence that acceptance criteria and metrics are met in simulation or live shard.

---

### Appendix – Recommended NPM Scripts

```json
{
  "scripts": {
    "sim": "screeps-launcher start --memory 2048 --reset --port 21025",
    "build": "webpack --config webpack.config.js --mode production",
    "lint": "eslint --ext .ts src",
    "format": "prettier --write \"src/**/*.{ts,js,json,md}\"",
    "test": "jest --runInBand",
    "watch": "webpack --config webpack.config.js --watch"
  }
}
```

Happy conquering, and remember: **fortunes favor the prepared AI**! 🚀 