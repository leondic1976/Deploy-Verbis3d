# Testing

The suite is divided into unit, integration, rendering-pipeline and browser tests.

```bash
npm run typecheck
npm run test
npm run test:coverage
npm run site:check
npm run test:e2e
```

Unit tests cover math, transforms, hierarchy, cameras, primitives, materials, animation,
validation, commands and offline rules. Integration tests cover engine scheduling, plugin
lifecycle, serialization, asset caching and scene-to-render-list behavior.

The Chromium E2E suite checks navigation, WebGL2 initialization, draw readiness, responsive
layout, Playground manipulation, natural-language feedback and console errors. It avoids pixel
snapshots because virtual GPU output varies.

`site:check` walks every generated HTML page, including TypeDoc output, and fails when a local
link or asset points outside `site-dist/` or does not exist.
