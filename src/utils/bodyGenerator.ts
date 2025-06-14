// @ts-nocheck
export function generateBasicBody(energyBudget: number): BodyPartConstant[] {
    const body: BodyPartConstant[] = [];
    const partSet: BodyPartConstant[] = [WORK, CARRY, MOVE];
    const setCost =
        BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
    const maxParts = 50;

    while (energyBudget >= setCost && body.length + 3 <= maxParts) {
        body.push(...partSet);
        energyBudget -= setCost;
    }

    return body;
} 