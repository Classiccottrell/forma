# Forma production roadmap from a React Bits research sample

Proposed 2026-11-26. This extends the V2 Matter plan in `BRIEF.md`; it does not
replace the owner's visual acceptance gate or the decision to keep the shape
catalog at 30. Each numbered item is a reviewable delivery, with its own
before/after images and focused browser checks. The cross-project catalog
decision (F0) precedes further composed-scene work.

## Research scope and lessons

Source sample: [React Bits at `37f53df`](https://github.com/DavidHDev/react-bits/tree/37f53df7efb61238b0fea9ea8be74e3cce62b959),
plus the live [Background Studio](https://reactbits.dev/tools/background-studio)
and [Shape Magic](https://reactbits.dev/tools/shape-magic) descriptions. This is
ten representative pieces and two tools, not a site-wide audit. The source
sample follows the REA reverse-engineering skill's source-first method; its
CLI could not run in this environment because Node 24.21.0 is below the CLI's
24.22.1 requirement. The sample is more specific than looking at marketing
pages alone:

| Sample | Source observation | Forma lesson |
| --- | --- | --- |
| [Aurora](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Backgrounds/Aurora/Aurora.jsx) | Multi-stop color, edge height, layers, intro, external time, pause, pointer, bounded DPR. Its [presets](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/demo/Backgrounds/presets/Aurora.js) alter structure and placement as well as color. | Curate composition and motion states, not only material colors. |
| [Silk](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Backgrounds/Silk/Silk.jsx) | Folds, sheen, depth, cursor light, click ripple and reduced motion are separate layers. | Give a material a recognizable response and a controlled highlight, not just a shader label. |
| [Letter Glitch](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Backgrounds/LetterGlitch/LetterGlitch.jsx) | Typography and glyph density define the image; cursor and click effects stay bounded. | Treat matter particles and haze as authored compositions with finite interaction state. |
| [Floating Lines](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Backgrounds/FloatingLines/FloatingLines.jsx) | Separate bands and staged intro/idle/pointer/click behavior. | Specify the visual role of each layer in a composed Forma + Linefield scene. |
| [Split Text](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/TextAnimations/SplitText/SplitText.jsx) and [Blur Text](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/TextAnimations/BlurText/BlurText.jsx) | Reveal has trigger, direction, stagger, completion and reduced-motion behavior. | Give Solid→Liquid→Gas transitions a readable beginning, hold, recovery and replay. |
| [Click Spark](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Animations/ClickSpark/ClickSpark.jsx) and [Magnet](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Animations/Magnet/Magnet.jsx) | Short-lived interaction states, bounded counts, pointer arbitration and cleanup. | Cursor modes need measurable lifetime, ownership and graceful rest states. |
| [Spotlight Card](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Components/SpotlightCard/SpotlightCard.jsx) and [Tilted Card](https://github.com/DavidHDev/react-bits/blob/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/content/Components/TiltedCard/TiltedCard.jsx) | Ambient, pointer, focus, touch and settling states are composed for an actual card context. | Test Forma scenes where they will live: hero, card and mobile, with foreground content. |
| [Background Studio](https://github.com/DavidHDev/react-bits/tree/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/tools/background-studio) | Per-background prop schemas, preset tiles, stage modes, pause/replay/snapshot, and code/image/video export. | Give users a clear path from starting look to tuned composition to reliable embed. |
| [Shape Magic](https://github.com/DavidHDev/react-bits/tree/37f53df7efb61238b0fea9ea8be74e3cce62b959/src/tools/shape-magic) | Curated mark/material galleries use committed rendered thumbnails; export is organized by output use. | Render true scene thumbnails and make the output choice legible. Its 2D mark engine is not a geometry reference for Forma's 3D objects. |

Forma already has a typed composition engine, 30 shapes, 21 materials, matter
states, atmosphere, ten presets, PNG/HTML/scene-link exports, reduced-motion
handling and a Linefield bridge. The weak point to address first is the
experience of *choosing and judging* a finished scene. The current
`PresetGallery` uses styled placeholder swatches rather than captured scene
images, and the composed scene `Into the Well` points at `funnel`, which is
not in Linefield's current 18-piece manifest.

## Delivery order

| Order | Backlog item | Acceptance evidence |
| --- | --- | --- |
| F0 | **Resolve the Linefield scene contract.** Choose either a published `funnel` or a re-authored `Into the Well` using an existing piece. Align `LINEFIELD_PIECES`, composed scenes, homepage, vendored fallback and remote baked source. | Every composed scene resolves to a current public Linefield piece; the downloaded standalone page works offline and the shared current visibly affects both layers. |
| F1 | **Art-direction audit before more content.** Capture every one of the 30 shapes in one consistent neutral setup, then a deeper matrix of representative shapes (Soft Blob, Knot, Vase, Card, Torus, Gem, Spring), materials and Solid/Liquid/Gas states under at least two environments. Rank silhouette, material identity, lighting, contact, motion and card-size recognition. | A reviewed contact sheet names what is weak and assigns a bounded fix to a specific shape, material, environment or matter state. No catalog growth is needed to pass. |
| F2 | **Real preview assets.** Generate committed, deterministic thumbnails from actual Forma compositions for every preset and the principal shape/material choices. Include source hashes so stale captures fail a check. | Picker thumbnails match what opens; each remains legible at its displayed size, including dark/light surroundings and a phone viewport. A source change cannot silently leave old images. |
| F3 | **Curated scene families.** Build on the ten full-composition presets with purposeful Solid, Liquid and Gas starters, including the shared Whisper/Ink/Neon/Drift/Dense vocabulary where a paired Linefield scene uses it. Keep a small number of excellent examples rather than multiplying every axis. | Each starter differs in silhouette, material, environment, motion and foreground balance; choosing one is a complete, usable scene. Presets can be edited without stranded values. |
| F4 | **Finish pass, one visual family per PR.** Tune material response and reflections, object edge quality, contact shadow, haze/particle depth and the transition between matter states. Prioritize combinations the F1 audit finds weak; close every flagged shape before calling the catalog ready. | Side-by-side captures at hero, card and square export sizes show distinct material identity and no clipped object, dead reflection, detached shadow or unreadable gas. Owner accepts each family. |
| F5 | **Scene context preview.** Offer landing, card and mobile frames with editable foreground copy, plus pause, replay, snapshot and a reduced-motion still. Keep the existing exact scene link and composed export. | A user can judge contrast, scale, safe space and motion around real content before export. Preview and embedded output agree at the same time/state. |
| F6 | **Lifecycle and export reliability.** Finish the open `BRIEF.md` H2/H3 work: cancellation and disposal ownership, versioned composition migrations, context-loss and repeated-mount browser tests, and high-DPI/export failure checks. Add a user-facing WebGL fallback state. | No leaked renderer/texture on repeated swaps; malformed or old compositions get a stable recovery path; PNG/standalone HTML/hosted embed survive failure and render as promised. |
| F7 | **Release review.** Run real-device desktop/phone GPU checks, accessibility and keyboard sweep, performance/size measurement, and owner review of the full scene contact sheet. | Documented release results and owner visual acceptance; then the existing V2 release gate can close. |

**After release, if demand supports it:** deterministic loop/video export and a
timeline. The current V2 brief deliberately defers a timeline. A controllable
clock and reproducible frames should precede any video exporter.

## Positioning

React Bits is a broad library of installable React components and creative
tools. Forma should be a focused, self-hostable 3D matter composer for a
finished interactive scene: one object, material, atmosphere and behavior,
with an exact scene link or standalone embed. The shared current with
Linefield is a concrete differentiator when it works in published scenes.
Compete on the quality of each authored scene and the reliability of delivery,
not on component count.
