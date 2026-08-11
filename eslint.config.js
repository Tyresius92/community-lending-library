import js from "@eslint/js";
import vitestPlugin from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jestDomPlugin from "eslint-plugin-jest-dom";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import markdownPlugin from "eslint-plugin-markdown";
import noSecretsPlugin from "eslint-plugin-no-secrets";
import playwrightPlugin from "eslint-plugin-playwright";
import reactPlugin from "eslint-plugin-react";
import reactCompilerPlugin from "eslint-plugin-react-compiler";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import storybookPlugin from "eslint-plugin-storybook";
import testingLibraryPlugin from "eslint-plugin-testing-library";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      "build/",
      "public/build/",
      "postgres-data/",
      "playwright-report/",
      "test-results/",
      "app/generated/",
      ".react-router/",
    ],
  },

  js.configs.recommended,

  ...storybookPlugin.configs["flat/recommended"],

  // React (js, jsx, ts, tsx)
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "react-compiler": reactCompilerPlugin,
      "no-secrets": noSecretsPlugin,
    },
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2021,
      },
    },
    settings: {
      react: { version: "detect" },
      formComponents: ["Form"],
      linkComponents: [
        { name: "Link", linkAttribute: "to" },
        { name: "NavLink", linkAttribute: "to" },
      ],
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat["jsx-runtime"].rules,
      ...reactHooksPlugin.configs["recommended-latest"].rules,
      ...jsxA11yPlugin.flatConfigs.strict.rules,
      curly: ["error", "all"],
      eqeqeq: ["error", "smart"],
      "no-console": "error",
      "no-eval": "error",
      "no-nested-ternary": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "react-compiler/react-compiler": "error",
    },
  },

  // TypeScript (ts, tsx)
  {
    files: ["**/*.{ts,tsx}"],
    // Excludes virtual files eslint-plugin-markdown extracts from fenced
    // code blocks (e.g. "CLAUDE.md/2_2.ts") — they aren't part of any real
    // tsconfig project, so type-aware rules can't run against them.
    ignores: ["**/*.md/**"],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/internal-regex": "^~/",
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.typescript.rules,
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/only-throw-error": [
        "error",
        // React Router's error-boundary mechanism (isRouteErrorResponse)
        // depends on loaders/actions throwing a real Response.
        { allow: [{ from: "lib", name: "Response" }] },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: true,
          allowNever: true,
          allowNullish: true,
          allowNumber: true,
        },
      ],
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-cycle": "error",
      "import/no-duplicates": "error",
      "import/no-mutable-exports": "error",
      "import/no-named-as-default": "error",
      "import/no-named-as-default-member": "error",
      "import/no-namespace": "error",
      "import/no-self-import": "error",
      "import/no-useless-path-segments": "error",
      "import/order": [
        "error",
        {
          alphabetize: { caseInsensitive: true, order: "asc" },
          groups: ["builtin", "external", "internal", "parent", "sibling"],
          "newlines-between": "always",
        },
      ],
      "react/hook-use-state": "error",
      "react/jsx-curly-brace-presence": "error",
      "react/jsx-no-constructed-context-values": "error",
      "react/no-array-index-key": "error",
      "react/no-unstable-nested-components": "error",
      "react/self-closing-comp": "error",
    },
  },

  // Markdown-embedded TypeScript code fences: syntax-only parsing (no
  // projectService) since these virtual files aren't part of any real
  // tsconfig project, but they still need the TS parser to handle
  // TS-only syntax (e.g. `satisfies`) that the base JS parser can't.
  {
    files: ["**/*.md/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommended],
  },

  // Routes: autofocus after validation errors is intentional here
  {
    files: ["app/routes/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/no-autofocus": "off",
    },
  },

  // Markdown
  ...markdownPlugin.configs.recommended,

  // Tests (Vitest)
  {
    files: ["**/*.test.{js,jsx,ts,tsx}"],
    plugins: {
      vitest: vitestPlugin,
      "jest-dom": jestDomPlugin,
      "testing-library": testingLibraryPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      ...jestDomPlugin.configs["flat/recommended"].rules,
      ...testingLibraryPlugin.configs["flat/react"].rules,
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // Tests (Playwright)
  {
    files: ["tests/**/*.spec.ts", "tests/**/*.ts"],
    ...playwrightPlugin.configs["flat/recommended"],
  },

  // Node files (mocks, Sentry server instrumentation entry point)
  {
    files: ["mocks/**/*.js", "instrument.server.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Server files — allow console. app/logger.ts is the one non-".server"
  // exception: it's isomorphic (used from client-reachable exports like
  // root.tsx's ErrorBoundary, not just loaders/actions), and its dev-mode
  // console.* fallback is the deliberate behavior backing the app's one
  // centralized logger, not a stray debug call.
  {
    files: [
      "**/*.server.{ts,tsx}",
      "**/*.server.test.{ts,tsx}",
      "app/logger.ts",
      "app/logger.test.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },

  prettier,

  // eslint-config-prettier turns `curly` off by default (some of its
  // variants can conflict with Prettier's output), but the "all" variant
  // used here doesn't — so re-assert it after prettier to keep it enabled.
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      curly: ["error", "all"],
    },
  },
);
