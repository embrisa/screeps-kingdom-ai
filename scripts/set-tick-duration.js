// Screeps server mod: set tick duration fast
// Usage: include this module path in mods.json. Adjust TICK_DURATION env var to override.
module.exports = function (config) {
    // Only run in the engine process where setTickDuration is available.
    if (config.engine && typeof config.engine.setTickDuration === 'function') {
        const desired = parseInt(process.env.TICK_DURATION || '1', 10);
        // Ensure positive integer >=1
        const duration = Number.isFinite(desired) && desired > 0 ? desired : 1;
        config.engine.on('init', () => {
            config.engine.setTickDuration(duration);
            console.log(`[fast-tick] Tick duration set to ${duration} ms`);
        });
    }
}; 