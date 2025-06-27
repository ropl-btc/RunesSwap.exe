declare module '@jest/globals' {
  const describe: typeof jest.describe;
  const it: typeof jest.it;
  const test: typeof jest.test;
  const expect: typeof jest.expect;
  const beforeEach: typeof jest.beforeEach;
  const afterEach: typeof jest.afterEach;
  const beforeAll: typeof jest.beforeAll;
  const afterAll: typeof jest.afterAll;
  const jest: typeof import('jest');
  export { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, jest };
}