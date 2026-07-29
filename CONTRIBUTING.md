# Contributing to Verbis3D

Use Node.js 20 or newer. Create a focused branch, add tests and documentation, then run:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run docs:api
npm run site:build
```

Do not add a complete 3D engine dependency. Preserve renderer/AI module boundaries, avoid
unvalidated external data and document public API behavior and errors. Architectural changes need
an ADR under `docs/decisions/`.
