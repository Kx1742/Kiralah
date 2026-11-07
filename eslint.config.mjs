import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const webFiles = ["apps/web/**/*.{ts,tsx}"];

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
      "apps/web/src/generated/**",
      "apps/web/playwright-report/**",
      "apps/web/test-results/**",
      ".tools/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // A leading underscore marks a value left out on purpose, e.g. { [key]: _removed, ...rest }.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  ...nextVitals.map((config) => ({ ...config, files: webFiles })),
  {
    files: webFiles,
    settings: { next: { rootDir: "apps/web/" } },
  },
  {
    // Every UI string goes through i18n: literal text in JSX is an error.
    files: ["apps/web/src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        { noStrings: false, ignoreProps: true },
      ],
    },
  },
  prettier,
);
