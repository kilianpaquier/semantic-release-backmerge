import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.all,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        // files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigDirName: import.meta.dirname,
            },
        },
        rules: {
            // Implicit any is prohibited because a developer must know if it's an any or a specific type
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "camelcase": "off",
            "capitalized-comments": "off",
            "line-comment-position": "off",
            "max-lines-per-function": ["error", 80],
            "max-params": ["error", 6],
            "max-statements": ["error", 25],
            "multiline-comment-style": "off",
            "no-await-in-loop": "off",
            "no-inline-comments": "off",
            "no-magic-numbers": "off",
            "no-ternary": "warn",
            "one-var": "off",
            "require-unicode-regexp": "off",
            "sort-imports": ["error", {
                allowSeparatedGroups: true
            }],
        }
    },
    {
        files: ["**/*.test.ts", "**/*.spec.ts"],
        rules: {
            "max-lines-per-function": "off",
        }
    },
    {
        files: ["**/*.js"],
        ...tseslint.configs.disableTypeChecked,
    },
);