# Screeps Kingdom – Strategy Overview

_“If you know the enemy and know yourself, you need not fear the result of a hundred battles.” – Sun Tzu_

This document distils **why** and **how** our AI conquers the Screeps realm.  Where the `README` explains the tool-chain and `ImplementationPlan.md` lists every granular task, this page paints the **30 000-foot view**—the guiding doctrine your creeps follow from spawn ☞ supremacy.

---

## 1 · Lifecycle & Milestones

Our empire evolves through six repeating feedback loops.  Each loop unlocks the next by raising **economy**, **CPU head-room** and **strategic options**.

| Phase | RCL/Scale | Prime Objective | Success Signals |
|-------|-----------|-----------------|-----------------|
| **0. Bootstrap** | RCL 1 | Build compiler → tick loop → first harvest | Tests, lint, build all green |
| **1. Sustainable Room** | RCL 2 | 100 % spawn uptime, 300 ℰ/tick income | Controller 2 in < 10 k ticks |
| **2. Infrastructure** | RCL 3-5 | Container mining, roads, haulers | Travel time ↓ 25 %, path cache hit ≥ 70 % |
| **3. Multi-Room** | RCL 6-7 | Remote mining & reservation | ≥ 2 rooms deliver 1 k ℰ/tick net |
| **4. Defense & PvP** | RCL 7-8 | Automated layered defense | Repel multi-wave raid unaided |
| **5. Market & Power** | RCL 8 | Convert surplus into credits & GPL | ≥ 50 💰/tick profit, first power creep |

The loops are **incremental**: we deploy after every phase, then measure & iterate.  Phase 6 (optimisation + ML) runs perpetually in the background.

---

## 2 · Economic Engine

1. **Static Harvesting** – Dedicated miners fill containers; haulers ferry energy.
2. **Room Planner** – Algorithmic layouts minimise fatigue and tower coverage gaps.
3. **Upgrade Throttle** – Upgrader count scales with stored energy to avoid bank-ruptcy.
4. **PathFinder Cache** – LRU cache + structure hash invalidation cuts CPU/path cost  > 80 %.

Key KPI: **Energy Throughput** (ℰ/tick) which fuels every strategic choice.

---

## 3 · Expansion Doctrine

We scout, score and claim rooms using the **Expansion Planner**:

```
score = sources·10 − distance·0.2 + mineral?5 − hostiles?50 − owned?100 − reserved?25
```

Gates:
* `storage.energy > 50 000`  AND  `cpu.bucket > 7000`  ⇒ expansion allowed.
* `Game.gcl.level > ownedRooms` ⇒ we may _claim_ instead of merely _reserve_.

Remote roles (`Pioneer → Reserver → StaticRemoteHarvester → RemoteHauler → RemoteDefender`) create a self-contained funnel that is paused automatically if home-room is resource-starved.

---

## 4 · Threat Management Stack

1. **ThreatAssessment** – Per-room profiler rates incoming DPS, HEAL & creep count → `ThreatProfile` (NONE … CRITICAL).
2. **DefenseManager** –
   * **MEDIUM+** spawn `Defender` creeps (ranged kite + heal).
   * **HIGH+** towers focus-fire healers then DPS.
   * **CRITICAL** computes breach ETA; auto-activates Safe Mode < 1500 ticks.
3. **Repairer & Tower AI** – Dynamic modes (IDLE / REPAIR / ATTACK) prioritise ramparts ≤ 10 %.
4. **Observer (Phase 4 pending)** – Early-warning on border rooms; dispatchs `RemoteDefender` before hostiles arrive.

The target SLA: **95 % raid survival**, ≤ 2 tick tower latency.

---

## 5 · Trade & Power Strategy

Once surplus energy > 5 M and minerals accumulate:

1. **Market Bot** (Phase 5)
   * Weighted moving average + linear regression per resource.
   * Maintain buy/sell orders with ≥ 5 % spread.
2. **Terminal Logistics** – Even out resources across colonies; throttle when `cpu.bucket < 7000`.
3. **Power Harvest** – Observer flags banks; spawn dismantler + healer squad; haul power back for spawn.
4. **Power Creep Road-map** – First `Operator` unlocks `OPERATE_CONTROLLER` and `OPERATE_STORAGE`.

Profit goal: **≥ 50 credits/tick** sustained.

---

## 6 · Win Condition

Victory is defined as **dominant, self-sustaining presence on all player-owned shards**, measured by:

* Top-1 % GCL growth rate on shard.
* Positive trade balance every 24 h.
* Zero critical-threat room losses in rolling 30 days.

Beyond that, we pursue _soft power_: market price control, alliance support and selective punitive strikes via the forthcoming **Retaliation Framework**.

---

## 7 · Guiding Principles

1. **Incremental Delivery** – Ship after every phase; learn in prod.
2. **CPU is a Currency** – Spend where ROI > energy ROI.
3. **Memory Hygiene** – Segments for bulky data; prune every 10 k ticks.
4. **Stat-Driven Decisions** – `statsManager` is a first-class citizen; no magic numbers.
5. **Fail-safe Defaults** – If unsure, preserve economy & creeps over territory.

---

## 8 · Glossary

* **ℰ/tick** – Energy per tick.
* **Highway** – Road network between home and remote container.
* **TTL** – Creep `ticksToLive`.
* **Breach ETA** – Ticks until weakest rampart falls under current DPS.

---

_Last updated: Game time ${Game.time}_ 