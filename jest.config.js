module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.(test|spec).[tj]s'],
    collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**'],
    setupFiles: ['<rootDir>/src/__tests__/setupGlobals.js'],
}; 