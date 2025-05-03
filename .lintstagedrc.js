/**
 * @type {import('lint-staged').Configuration}
 */
module.exports = {
  // Run ESLint on JavaScript and TypeScript files
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  // Run Prettier on CSS, JSON, and Markdown files
  "*.{css,json,md}": ["prettier --write"],
};
