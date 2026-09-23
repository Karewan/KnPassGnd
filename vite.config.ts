import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/index.ts",
			name: "KnPassGnd",
			formats: ["es", "cjs", "umd"],
			fileName: (format) => {
				switch (format) {
					case "es":
						return "index.js";
					case "cjs":
						return "index.cjs";
					case "umd":
						return "index.umd.cjs";
					default:
						throw new Error(`Unsupported library format: ${format}`);
				}
			},
		},
	},
});
