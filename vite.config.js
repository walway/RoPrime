import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "dist",
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, "popup.html"),
                content: resolve(__dirname, "content.entry.js"),
            },
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "chunks/[name].js",
                assetFileNames: "assets/[name][extname]",
            },
        },
    },
});
