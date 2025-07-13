module.exports = {
  extends: ["next", "next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@next/next/no-img-element": "off",
    "react-hooks/exhaustive-deps": "off",
    "@typescript-eslint/no-require-imports": "off",
    "prefer-const": "off",
  },
}; 