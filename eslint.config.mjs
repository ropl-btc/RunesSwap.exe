import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Files and directories to ignore
const ignores = [
  // Build outputs
  "build/**",
  "coverage/**",
  "dist/**",
  ".next/**",
  "out/**",
  ".vercel/**",
  ".turbo/**",

  // Generated files
  "**/*.min.js",
  "**/*.min.css",
  "**/*.bundle.js",

  // Dependencies
  "node_modules/**",
  ".pnpm-store/**",
  ".npm/**",

  // Version control
  "**/.git/**",
  "**/.svn/**",
  "**/.hg/**",

  // Package files
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",

  // Environment files
  ".env*",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",

  // Logs
  "logs/**",
  "**/*.log",
  "**/npm-debug.log*",
  "**/yarn-debug.log*",
  "**/yarn-error.log*",
  "**/pnpm-debug.log*",

  // OS files
  "**/.DS_Store",
  "**/Thumbs.db",

  // IDE/editor files
  ".idea/**",
  ".vscode/**",
  ".cursor/**",
  "**/.cursor/**",
  "**/*.swp",
  "**/*.swo",
  "**/*.mdc",

  // Configuration files
  ".windsurfrules",
  "next-env.d.ts",
  "pnpm-workspace.yaml",
  ".prettierrc",
  ".npmrc",
  "tsconfig.json",

  // API documentation
  "liquidium-openapi/**",
  "**/liquidium-openapi/**",

  // Database files
  "migrations/**",
  "**/migrations/**",

  // Binary and asset files
  "**/*.png",
  "**/*.jpg",
  "**/*.jpeg",
  "**/*.gif",
  "**/*.ico",
  "**/*.svg",
  "**/*.ttf",
  "**/*.woff",
  "**/*.woff2",
  "**/*.eot",
  "**/public/**",
];

const eslintConfig = [
  // Global ignores
  {
    ignores,
  },

  // Base configurations
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Custom rules
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    rules: {
      // Possible errors
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],

      // Best practices
      "curly": ["error", "all"],
      "eqeqeq": ["error", "always", { null: "ignore" }],

      // ES6
      "arrow-body-style": ["error", "as-needed"],
      "prefer-const": "error",

      // Stylistic issues
      "max-len": ["warn", {
        code: 100,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true
      }],
    },
  },

  // Prettier config (must be last to override other configs)
  eslintConfigPrettier,
];

export default eslintConfig;
