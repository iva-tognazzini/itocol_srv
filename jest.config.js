module.exports = {
    roots: [
        "<rootDir>/bin",
        // "<rootDir>/src"
    ],
    testTimeout: 50000,
    verbose: true,
    // testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
    testMatch: ["**/?(*.)+(spec|test).js"],
    // transform: {        "^.+\\.(ts|tsx)$": "ts-jest"    },
    transform: { "\\.js$": "babel-jest" },
    collectCoverageFrom: [
        "**/*.{js,jsx}",
        "!**/*.d.ts",
        "!**/node_modules/**",
    ],
    testEnvironment: 'node',
    // globals: {
    //     "ts-jest": {
    //         tsconfig: "tsconfig.json",
    //     },
    // },
}