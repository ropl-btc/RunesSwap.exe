/**
 * @type {import('lint-staged').Configuration}
 */
module.exports = {
  // Run ESLint on JavaScript and TypeScript files
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  // Run Stylelint and Prettier on CSS files
  "*.css": ["stylelint --fix", "prettier --write"],
  // Run Prettier on JSON and Markdown files
  "*.{json,md}": ["prettier --write"],
};
