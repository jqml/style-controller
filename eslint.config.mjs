import obsidian from "eslint-plugin-obsidianmd";
import tsParser from "@typescript-eslint/parser";

const typeSafetyWarnings = {
  "@typescript-eslint/no-unsafe-assignment": "warn",
  "@typescript-eslint/no-unsafe-member-access": "warn",
  "@typescript-eslint/no-unsafe-call": "warn",
  "@typescript-eslint/no-unsafe-argument": "warn",
  "@typescript-eslint/no-unsafe-return": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  "@typescript-eslint/require-await": "warn",
  "@typescript-eslint/no-floating-promises": "warn",
  "@typescript-eslint/no-misused-promises": "warn",
  "@typescript-eslint/restrict-template-expressions": "warn",
  "@typescript-eslint/restrict-plus-operands": "warn"
};

export default [
  {
    ignores: [
      "main.js",
      "node_modules/**",
      "dist/**",
      "coverage/**"
    ]
  },
  ...obsidian.configs.recommended,
  {
    files: ["**/*.{ts,js,mjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        sourceType: "module"
      }
    },
    rules: typeSafetyWarnings
  }
];
