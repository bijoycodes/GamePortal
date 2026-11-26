/**
 * Tailwind CSS 4 discovers utility classes automatically; the theme tokens live in
 * `src/app/globals.css` under `@theme`. This config keeps explicit source globs for
 * tooling that still reads a Tailwind config.
 */
const config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
