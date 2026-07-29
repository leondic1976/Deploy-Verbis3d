import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  base: "/Deploy-Verbis3d/",
  build: {
    outDir: "../site-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: "site/index.html",
        docs: "site/docs.html",
        examples: "site/examples.html",
        playground: "site/playground.html",
        architecture: "site/architecture.html",
        roadmap: "site/roadmap.html",
      },
    },
  },
});
