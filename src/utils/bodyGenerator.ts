import { RoleName } from '../types';

const bodyTemplates: Record<RoleName, BodyPartConstant[]> = {
  harvester: [WORK, CARRY, MOVE],
  builder: [WORK, CARRY, MOVE],
  upgrader: [WORK, CARRY, MOVE],
  repairer: [WORK, CARRY, MOVE],
  hauler: [CARRY, MOVE],
  staticHarvester: [WORK, MOVE],
  scout: [MOVE],
  reserver: [CLAIM, MOVE],
  pioneer: [WORK, CARRY, MOVE],
  remoteHarvester: [WORK, WORK, CARRY, MOVE],
  remoteHauler: [CARRY, CARRY, MOVE],
  remoteDefender: [TOUGH, RANGED_ATTACK, HEAL, MOVE],
  defender: [RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, HEAL],
};

const getBodyCost = (body: BodyPartConstant[]): number => {
  return body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
};

export function generateBody(role: RoleName, energyBudget: number): BodyPartConstant[] {
  const template = bodyTemplates[role] || bodyTemplates.harvester;
  const templateCost = getBodyCost(template);
  const body: BodyPartConstant[] = [];
  const maxParts = 50;

  if (role === 'staticHarvester') {
    // For static harvesters, we want to maximize WORK parts.
    // Start with one MOVE part, then fill with WORK parts.
    body.push(MOVE);
    energyBudget -= BODYPART_COST[MOVE];

    const workPartCost = BODYPART_COST[WORK];
    const workParts = Math.floor(energyBudget / workPartCost);

    for (let i = 0; i < workParts; i++) {
      if (body.length < maxParts) {
        body.unshift(WORK); // Put WORK parts first
      }
    }
    return body;
  }

  // For other roles, repeat the template
  while (energyBudget >= templateCost && body.length + template.length <= maxParts) {
    body.push(...template);
    energyBudget -= templateCost;
  }

  // For CARRY-heavy roles like haulers, try to add one more CARRY if possible
  if (role === 'hauler' && energyBudget >= BODYPART_COST[CARRY] && body.length < maxParts) {
    body.push(CARRY);
  }

  // For WORK-heavy roles, use remaining energy for extra WORK parts
  if (
    (role === 'builder' || role === 'upgrader' || role === 'repairer') &&
    energyBudget >= BODYPART_COST[WORK] &&
    body.length < maxParts
  ) {
    const workParts = Math.floor(energyBudget / BODYPART_COST[WORK]);
    for (let i = 0; i < workParts; i++) {
      if (body.length < maxParts) {
        body.unshift(WORK);
      }
    }
  }

  // For defender roles, prioritize ranged attack and heal parts
  if (
    role === 'defender' &&
    energyBudget >= BODYPART_COST[RANGED_ATTACK] &&
    body.length < maxParts
  ) {
    const rangedParts = Math.floor(
      energyBudget / (BODYPART_COST[RANGED_ATTACK] + BODYPART_COST[MOVE]),
    );
    for (let i = 0; i < rangedParts; i++) {
      if (body.length + 1 < maxParts) {
        body.push(RANGED_ATTACK, MOVE);
        energyBudget -= BODYPART_COST[RANGED_ATTACK] + BODYPART_COST[MOVE];
      }
    }
  }

  return body;
}
