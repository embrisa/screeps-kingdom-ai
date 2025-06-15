import { Logger } from './Logger';

/**
 * A simple profiler that measures the CPU usage of a function.
 * @param name - The name of the function being profiled.
 * @param fn - The function to profile.
 */
export function profile(name: string, fn: () => void): void {
  const start = Game.cpu && Game.cpu.getUsed ? Game.cpu.getUsed() : 0;
  fn();
  const end = Game.cpu && Game.cpu.getUsed ? Game.cpu.getUsed() : 0;

  const diff = end - start;
  const PROFILE_INTERVAL = 1000;
  if (Game.time % PROFILE_INTERVAL === 0 && Number.isFinite(diff)) {
    Logger.debug(`[PROFILER] ${name}: ${diff.toFixed(3)} CPU`);
  }
}
