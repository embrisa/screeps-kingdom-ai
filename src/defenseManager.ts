import { Logger } from './utils/Logger';
import _ from 'lodash';

export class DefenseManager {
  private room: Room;

  constructor(room: Room) {
    this.room = room;
  }

  public run(): void {
    this.assessThreats();
    this.controlTowers();
    this.manageDefenders();
    this.manageSafeMode();
  }

  private assessThreats(): void {
    const hostiles = this.room.find(FIND_HOSTILE_CREEPS);
    const hostileCount = hostiles.length;

    if (hostileCount === 0) {
      this.room.memory.threatProfile = {
        level: 'NONE',
        type: 'PEACETIME',
        dps: 0,
        heal: 0,
        hostileCount: 0,
        lastUpdated: Game.time,
      };
      return;
    }

    let totalDps = 0;
    let totalHeal = 0;

    hostiles.forEach((creep) => {
      creep.body.forEach((part) => {
        switch (part.type) {
          case ATTACK:
            totalDps += ATTACK_POWER;
            break;
          case RANGED_ATTACK:
            totalDps += RANGED_ATTACK_POWER;
            break;
          case HEAL:
            totalHeal += HEAL_POWER;
            break;
        }
      });
    });

    let level: ThreatProfile['level'] = 'LOW';
    if (totalDps > 500 || hostileCount > 5) level = 'HIGH';
    else if (totalDps > 200) level = 'MEDIUM';

    if (totalHeal > 200) level = 'CRITICAL';

    const threatProfile: ThreatProfile = {
      level,
      type: 'HARASS', // Basic type for now, will be enhanced later
      dps: totalDps,
      heal: totalHeal,
      hostileCount,
      lastUpdated: Game.time,
    };

    this.room.memory.threatProfile = threatProfile;

    if (Game.time % 10 === 0) {
      Logger.warn(
        `Threat detected in ${this.room.name}: Level=${level}, DPS=${totalDps}, Heal=${totalHeal}`,
      );
    }

    // Send notification for critical threats
    if (
      level === 'CRITICAL' &&
      (!this.room.memory.lastCriticalAlert || Game.time - this.room.memory.lastCriticalAlert > 1000)
    ) {
      Game.notify(
        `🚨 CRITICAL THREAT in ${this.room.name}! DPS: ${totalDps}, Heal: ${totalHeal}, Hostiles: ${hostileCount}`,
        10,
      );
      this.room.memory.lastCriticalAlert = Game.time;
    }
  }

  private controlTowers(): void {
    const threatProfile = this.room.memory.threatProfile;
    if (!threatProfile || threatProfile.level === 'NONE') {
      this.room.memory.defenseStatus = { mode: 'IDLE' };
      return;
    }

    const referencePos = this.room.find(FIND_MY_SPAWNS)[0]?.pos || this.room.controller?.pos;
    if (!referencePos) {
      Logger.error(`No reference position in ${this.room.name} for defense targeting.`);
      return;
    }

    // Prioritize targets: Healers > High DPS > Others
    const hostiles = this.room.find(FIND_HOSTILE_CREEPS);
    const healers = hostiles.filter((h) => h.body.some((p) => p.type === HEAL));

    let focusTarget: Creep | null = null;
    if (healers.length > 0) {
      focusTarget = referencePos.findClosestByRange(healers);
    } else {
      focusTarget = referencePos.findClosestByRange(hostiles);
    }

    if (focusTarget) {
      this.room.memory.defenseStatus = {
        mode: 'ATTACK',
        focusTarget: focusTarget.id,
      };
      if (Game.time % 5 === 0) {
        this.room.visual.text(`🎯 ${focusTarget.name}`, focusTarget.pos, {
          color: 'red',
          font: 0.8,
        });
        Logger.info(`DefenseManager targeting ${focusTarget.name} in ${this.room.name}`);
      }
    } else {
      this.room.memory.defenseStatus = { mode: 'IDLE' };
    }
  }

  private manageDefenders(): void {
    const threatProfile = this.room.memory.threatProfile;
    if (!threatProfile || threatProfile.level === 'NONE' || threatProfile.level === 'LOW') {
      return; // Spawn defenders for MEDIUM+ threats
    }

    const defenders = _.filter(
      Game.creeps,
      (c) => c.memory.role === 'defender' && c.memory.homeRoom === this.room.name,
    );

    const desiredDefenders = Math.min(
      Math.ceil(threatProfile.hostileCount / 2),
      4, // Cap at 4 defenders for now
    );

    if (defenders.length < desiredDefenders) {
      this.requestDefender();
    }

    const defenseStatus = this.room.memory.defenseStatus;
    if (defenseStatus?.mode === 'ATTACK' && defenseStatus.focusTarget) {
      defenders.forEach((defender) => {
        defender.memory.targetId = defenseStatus.focusTarget;
      });
    }
  }

  private requestDefender(): void {
    const memory: CreepMemory = {
      role: 'defender',
      homeRoom: this.room.name,
    };

    const request: SpawnRequest = {
      role: 'defender',
      memory,
      priority: 1, // High priority
    };

    if (!Memory.spawnQueue) {
      Memory.spawnQueue = [];
    }
    // Avoid duplicate requests
    if (!Memory.spawnQueue.some((r) => r.memory.role === 'defender')) {
      Memory.spawnQueue.unshift(request);
      Logger.info(`DefenseManager: Queued new defender for ${this.room.name}`);
    }
  }

  private manageSafeMode(): void {
    const threatProfile = this.room.memory.threatProfile;

    // Only consider safe mode for critical threats
    if (!threatProfile || threatProfile.level !== 'CRITICAL') {
      return;
    }

    // Don't spam safe mode activation
    if (this.room.memory.safeModeQueued) {
      return;
    }

    // Calculate breach time based on rampart health and incoming DPS
    const ramparts = this.room.find(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_RAMPART,
    }) as StructureRampart[];

    if (ramparts.length === 0) {
      // No ramparts, activate safe mode immediately for critical threats
      this.activateSafeMode('No defensive ramparts detected');
      return;
    }

    // Find the weakest rampart
    const weakestRampart = ramparts.reduce((min, rampart) =>
      rampart.hits < min.hits ? rampart : min,
    );

    // Estimate repair capacity (assume 2 repair creeps with 5 WORK parts each)
    const repairCapacity = 2 * 5 * REPAIR_POWER; // 100 repair per tick
    const netDamage = Math.max(0, threatProfile.dps - repairCapacity);

    if (netDamage > 0) {
      const breachTime = Math.floor(weakestRampart.hits / netDamage);
      const criticalThreshold = 1500; // 1500 ticks = ~75 minutes

      if (breachTime < criticalThreshold) {
        this.activateSafeMode(`Breach imminent: ${breachTime} ticks remaining`);
      }
    }
  }

  private activateSafeMode(reason: string): void {
    if (this.room.controller && this.room.controller.safeModeAvailable > 0) {
      const result = this.room.controller.activateSafeMode();
      if (result === OK) {
        Game.notify(`⚠️ SAFE MODE ACTIVATED in ${this.room.name}: ${reason}`, 15);
        Logger.error(`Safe Mode activated in ${this.room.name}: ${reason}`);
        this.room.memory.safeModeQueued = true;
      } else {
        Logger.error(`Failed to activate Safe Mode in ${this.room.name}: ${result}`);
      }
    } else {
      Game.notify(`🚨 NO SAFE MODE AVAILABLE in ${this.room.name}: ${reason}`, 15);
      Logger.error(`No Safe Mode available in ${this.room.name}: ${reason}`);
    }
  }
}
