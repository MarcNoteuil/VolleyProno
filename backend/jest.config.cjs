module.exports = {
	displayName: 'backend',
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: [
		'**/tests/**/*.test.ts',
		'**/tests/**/*.spec.ts'
	],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/server.ts'
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
	testTimeout: 20000,
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs' } }]
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
	roots: ['<rootDir>/src', '<rootDir>/tests']
};
