import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = String(
	process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "",
).trim();

/** Chrome content scripts cannot use bare `import` — bundle as one IIFE file. */
export default defineConfig({
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
		__ROPrime_SUPABASE_URL__: JSON.stringify(supabaseUrl),
		__ROPrime_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, "src/content/content.entry.js"),
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
