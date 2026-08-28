# Portfolio Website

A React 18 + Vite portfolio shell with a fully GPU-driven, image-derived hero reveal. The home hero is the first complete section; the remaining routes and the next home section are intentionally scaffolded for later content direction.

## Run locally

```bash
npm install
npm run dev
```

The Vite server binds to `0.0.0.0` so it also works in a proxied preview environment. A production build can be generated with `npm run build` and served with `npm run preview`.

## Hero architecture

The complete hero lives under `src/pages/HomePage/sections/HeroSection/`:

- `constants/heroConfig.js` is the source of truth for image path, timeline, camera, particle counts, wave phases, text, post-processing, and quality settings.
- `hooks/useImageSampler.js` loads the configured source, creates the analysis buffer, extracts a palette, builds the depth map, and creates the one-time particle attributes. If the configured image cannot be loaded, it uses a small procedural fallback so the experience still degrades gracefully.
- `utils/edgeDetection.js` combines Sobel magnitude and local variance into the detail importance field. `particlePositionGenerator.js` uses that field for weighted sampling, so flat image regions receive little or no particle density.
- `components/ParticleField.jsx` renders flat quads through `THREE.InstancedMesh`. Base/target positions, sampled color, UV, rotation axis, speed, phase, and size are all instance attributes. Rotation, foreshortening, flare duty-cycle gating, wave color, and final fragment resolution happen in GLSL.
- `components/ImagePlane.jsx` is the full-resolution ground truth underneath the particles. It uses the same source texture and UV mapping and resolves to the exact sampled image instead of relying on a fade.
- `hooks/useUnifiedTimeline.js` owns the single clock and custom weighted cubic-bezier progress driver. Camera, particle/image wave, text, post effects, and resolution all read from that shared ref.
- `components/HeroText.jsx` uses per-character Drei/Troika SDF text meshes. The same headline also exists as a real DOM heading for screen readers and crawlers.
- `components/PostFX.jsx` enables tier-appropriate bloom, vignette, grain, and depth of field through `@react-three/postprocessing`.

## Swapping the hero image

Replace `public/assets/hero/hero-source.jpg`, or update `heroConfig.imageSource`. The loader derives analysis dimensions, depth, weighted particle positions, colors, palette, and plane dimensions from the new image. No particle code needs to change.

## Quality and fallback behavior

- Low, medium, and high tiers select approximately 12k, 35k, and 70k particles.
- DPR is capped at 2. Low disables bloom, grain, and full DoF; medium uses light bloom and shader depth falloff; high enables the full post stack.
- `prefers-reduced-motion` renders the final image and visible HTML heading without mounting the particle animation.
- WebGL support is checked before the canvas is mounted. Context loss pauses the shared timeline and resumes it after restoration.
- The hero route and WebGL canvas are lazy-loaded, leaving the initial page shell lightweight.

## Project structure

```text
public/
└── assets/hero/hero-source.jpg
src/
├── components/shared/{Navbar,Loader}/
├── pages/
│   ├── HomePage/
│   │   └── sections/
│   │       ├── HeroSection/
│   │       │   ├── components/
│   │       │   ├── hooks/
│   │       │   ├── utils/
│   │       │   └── constants/
│   │       └── SectionTwoPlaceholder/
│   ├── AboutPage/
│   ├── WorkPage/
│   └── ContactPage/
├── App.jsx
├── router.jsx
└── styles/
```

About, Work, Contact, the shared Navbar, and Section Two contain only structural placeholders as requested.
