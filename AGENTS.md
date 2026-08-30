# Sample AGENTS.md file

RoPrime is a browser extension for roblox.com that provides design-change features.

## Dev environment tips

- Always use `deno task build` to build the project. If the build fails, stop and request human intervention.
- Dependencies are managed in `deno.json` (npm: and JSR imports). Do not add or rely on `node_modules`.
- Run `deno run -A npm:prettier --write path/to/file` to format the code and automatically fix safe linting errors.

## PR instructions

- Always run `deno task build` locally to verify the compilation before finishing a task or opening a Pull Request.

## Repository Architecture

- /src: Contains the main browser extension source code
- /resources: Contains images and resources for the browser extension.
- /_locales: Contains folders with translation keys.
- deno.json: Deno config, npm/JSR import map, and build task definitions.
- tasks/build.js: esbuild bundler for content scripts and platform dist assembly.
- src/manifests/: Chrome and Firefox extension manifests (copied into dist on build).

## Agent Constraints & Behavior

- Do Not Guess: If a task requirement or a build failure is ambiguous, ask the user for clarification immediately.
- Idempotency: Ensure scripts and your code changes can run multiple times without breaking the environment.
