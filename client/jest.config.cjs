module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  moduleNameMapper: { "\\.css$": "<rootDir>/test/styleMock.cjs" },
  collectCoverageFrom: ["src/**/*.{js,jsx}"],
  coverageReporters: ["text", "lcov"],
  testMatch: ["**/test/**/*.test.jsx"],
};
