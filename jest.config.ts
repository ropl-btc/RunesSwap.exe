import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node", // Assuming node environment for now, can be changed later if needed for UI tests
};

export default config;
