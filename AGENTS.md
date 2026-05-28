# Sample AGENTS.md file

RoPrime is a browser extension for roblox.com that provides design-change features.

## Dev environment tips
- Always use `npm` to build the project. If the build fails, stop and request human intervention.
- Run `npm install --filter <package_name>` to add a package to workspace so npm, Biome and JavaScript can see it.
- Run `biome check --write .` to format the code and automatically fix safe linting errors.

## PR instructions
- Always run `npm run build` locally to verify the compilation before finishing a task or opening a Pull Request.

## Repository Architecture
- /src: Contains the main browser extension source code
- /resources: Contains images and resources for the browser extension.
- /.locales: Contains folders with translation keys.
- biome.json: Defines the linting and formatting rules for the codebase.
- manifest.json: The extension entry point configuration defining permissions, scripts, and assets.
- vite.content.config.js: The Vite configuration file used specifically for bundling the content scripts.

## Agent Constraints & Behavior
- Do Not Guess: If a task requirement or a build failure is ambiguous, ask the user for clarification immediately.
- Idempotency: Ensure scripts and your code changes can run multiple times without breaking the environment.