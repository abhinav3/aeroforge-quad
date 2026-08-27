# AeroForge QUAD

Interactive aerodynamic and 6-DOF flight-dynamics simulator for quadcopters.

## Netlify deployment

Netlify reads `netlify.toml` automatically. It installs the locked pnpm dependencies, runs `pnpm run build:netlify`, and publishes `netlify-dist`.

## Local development

```bash
pnpm install
pnpm dev
```

The Netlify production bundle can be verified locally with:

```bash
pnpm run build:netlify
```
