import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";
import typescriptParser from "@typescript-eslint/parser";

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
  // Generated SDK
  "src/sdk/liquidium/**",
];

const eslintConfig = [
  // Global ignores
  {
    ignores,
  },

  // Base configurations
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Import plugin configuration
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
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
        code: 80,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: true
      }],

      // Import organization for AI readability (relaxed rules)
      "import/order": ["warn", {
        "groups": [
          "builtin",
          "external", 
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "ignore",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }],
      "import/newline-after-import": "warn",
      "import/no-duplicates": "error",
      "sort-imports": ["warn", {
        "ignoreCase": false,
        "ignoreDeclarationSort": true,
        "ignoreMemberSort": false,
        "memberSyntaxSortOrder": ["none", "all", "multiple", "single"],
        "allowSeparatedGroups": true
      }],
    },
  },

  // Prettier config (must be last to override other configs)
  eslintConfigPrettier,
];

export default eslintConfig;
