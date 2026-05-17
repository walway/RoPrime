import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Chrome content scripts cannot use bare `import` — bundle as one IIFE file. */
export default defineConfig({
	build: {
		outDir: "dist",
		emptyOutDir: false,
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, "content.entry.js"),
			name: "RoPrime",
			formats: ["iife"],
			fileName: () => "content.js",
		},
		rollupOptions: {
			output: {
				inlineDynamicImports: true,
			},
		},
	},
});
