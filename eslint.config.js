import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-case-declarations": "off",
      // Allow re-exports in component files for backwards compatibility
      "react-refresh/only-export-components": [
        "warn",
        {
          allowExportNames: [
            "calculateProportionalHeight",
            "calculateProportionalWidth",
            "clampDimension",
            "clampPaddingSize",
            "clampWatermarkSize",
            "clampWatermarkOpacity",
          ],
        },
      ],
      // Allow setState in effects for syncing external props (controlled components pattern)
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
