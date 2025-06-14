// @ts-nocheck

export function profile(name: string, fn: () => void): void {
    const start = Game?.cpu?.getUsed ? Game.cpu.getUsed() : 0;
    fn();
    const end = Game?.cpu?.getUsed ? Game.cpu.getUsed() : 0;
    if (Game.time % 100 === 0) {
        console.log(`[PROFILER] ${name}: ${(end - start).toFixed(3)} CPU`);
    }
} 