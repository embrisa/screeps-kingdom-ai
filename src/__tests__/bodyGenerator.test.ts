import { generateBody } from '../utils/bodyGenerator';
import { RoleName } from '../types';

describe('generateBody', () => {
  // Test case for a low energy budget (300) - starter room
  describe('with 300 energy', () => {
    const budget = 300;

    it('should generate a basic harvester', () => {
      const body = generateBody('harvester', budget);
      // [WORK, CARRY, MOVE] costs 200. One set should be generated.
      expect(body).toEqual([WORK, CARRY, MOVE]);
    });

    it('should generate a basic upgrader', () => {
      const body = generateBody('upgrader', budget);
      // [WORK, CARRY, MOVE] template (200) + one extra WORK (100)
      expect(body).toEqual([WORK, WORK, CARRY, MOVE]);
    });

    it('should generate a hauler', () => {
      const body = generateBody('hauler', budget);
      // [CARRY, MOVE] template (100) * 3
      expect(body).toEqual([CARRY, MOVE, CARRY, MOVE, CARRY, MOVE]);
    });

    it('should generate a static harvester', () => {
      const body = generateBody('staticHarvester', budget);
      // 1 MOVE (50) + 2 WORK (200) = 250
      expect(body).toEqual([WORK, WORK, MOVE]);
    });
  });

  // Test case for a medium energy budget (550) - RCL 2
  describe('with 550 energy', () => {
    const budget = 550;

    it('should generate a larger builder', () => {
      const body = generateBody('builder', budget);
      // [WORK, CARRY, MOVE] * 2 (400) + 1 WORK (100) = 500
      expect(body).toEqual([WORK, WORK, CARRY, MOVE, WORK, CARRY, MOVE]);
    });

    it('should generate a larger hauler', () => {
      const body = generateBody('hauler', budget);
      // [CARRY, MOVE] * 5 (500) + 1 CARRY (50)
      expect(body).toEqual([
        CARRY,
        MOVE,
        CARRY,
        MOVE,
        CARRY,
        MOVE,
        CARRY,
        MOVE,
        CARRY,
        MOVE,
        CARRY,
      ]);
    });
  });

  // Test max parts limit
  it('should not generate a body with more than 50 parts', () => {
    const budget = 4000; // High budget
    const body = generateBody('hauler', budget);
    expect(body.length).toBeLessThanOrEqual(50);
  });

  // Test cost calculation
  it('should generate a body that does not exceed the energy budget', () => {
    const budget = 730;
    const roles: RoleName[] = [
      'harvester',
      'builder',
      'upgrader',
      'hauler',
      'staticHarvester',
      'repairer',
    ];

    roles.forEach((role) => {
      const body = generateBody(role, budget);
      const cost = body.reduce((acc, part) => acc + BODYPART_COST[part], 0);
      expect(cost).toBeLessThanOrEqual(budget);
    });
  });
});
