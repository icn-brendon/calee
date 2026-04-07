import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/shell/calee-shell.ts"),
      formats: ["es"],
      fileName: () => "planner_panel.js",
    },
    outDir: resolve(
      __dirname,
      "../custom_components/calee/frontend/dist",
    ),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // Inline everything into a single ES module.
        inlineDynamicImports: true,
      },
    },
    // Inline all deps (lit, etc.) — no externals.
    target: "es2022",
    minify: "terser",
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@store": resolve(__dirname, "src/store"),
      "@styles": resolve(__dirname, "src/styles"),
      "@views": resolve(__dirname, "src/views"),
    },
  },
});
