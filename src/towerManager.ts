import { Logger } from './utils/Logger';

export class TowerManager {
  private room: Room;
  private towers: StructureTower[];

  constructor(room: Room) {
    this.room = room;
    this.towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER },
    });
  }

  public run(): void {
    if (this.towers.length === 0) {
      return;
    }

    // The new DefenseManager will set the defense status in memory
    const defenseStatus = this.room.memory.defenseStatus;

    if (defenseStatus?.mode === 'ATTACK' && defenseStatus.focusTarget) {
      const target = Game.getObjectById(defenseStatus.focusTarget);
      if (target) {
        this.attackTarget(target);
        return;
      }
    }

    // Check for repair mode
    if (defenseStatus?.mode === 'REPAIR' && defenseStatus.repairTarget) {
      const target = Game.getObjectById(defenseStatus.repairTarget);
      if (target) {
        this.repairTarget(target);
        return;
      }
    }

    // Fallback logic when DefenseManager isn't controlling
    const hostiles = this.room.find(FIND_HOSTILE_CREEPS);
    if (hostiles.length > 0) {
      const closestHostile = this.towers[0].pos.findClosestByRange(hostiles);
      if (closestHostile) {
        this.attackTarget(closestHostile);
        return;
      }
    }

    // Heal friendly creeps if no combat
    this.healFriendlyCreeps();

    // Repair critical structures during peacetime
    this.repairCriticalStructures();
  }

  private attackTarget(target: Creep): void {
    this.towers.forEach((tower) => {
      if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= 10) {
        tower.attack(target);
      }
    });
    Logger.info(`Towers in ${this.room.name} attacking ${target.name}`);
  }

  private repairTarget(target: Structure): void {
    this.towers.forEach((tower) => {
      if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= 10) {
        tower.repair(target);
      }
    });
  }

  private healFriendlyCreeps(): void {
    // Find damaged friendly creeps
    const damagedCreeps = this.room.find(FIND_MY_CREEPS, {
      filter: (creep) => creep.hits < creep.hitsMax,
    });

    if (damagedCreeps.length > 0) {
      const mostDamaged = damagedCreeps.reduce((min, creep) =>
        creep.hitsMax - creep.hits > min.hitsMax - min.hits ? creep : min,
      );

      this.towers.forEach((tower) => {
        if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= 10) {
          tower.heal(mostDamaged);
        }
      });
    }
  }

  private repairCriticalStructures(): void {
    // Find critical structures that need repair (prioritize ramparts and walls)
    const criticalStructures = this.room.find(FIND_STRUCTURES, {
      filter: (s) => {
        if (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) {
          return s.hits < s.hitsMax * 0.1; // Only repair if below 10% health
        }
        return s.hits < s.hitsMax * 0.5; // Other structures at 50% health
      },
    });

    if (criticalStructures.length > 0) {
      const mostDamaged = criticalStructures.reduce((min, structure) =>
        structure.hits < min.hits ? structure : min,
      );

      this.towers.forEach((tower) => {
        if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= 10) {
          tower.repair(mostDamaged);
        }
      });
    }
  }
}
