# Handoff to Claude — Forma and Linefield quality pass

Updated 2026-11-26. The user wants both tools polished to a production-ready
standard, using a bounded reverse-engineering sample of React Bits as a quality
reference. Do not call the roadmaps or the products finished. Start by reading
the local repos and the open draft PRs below. Do not merge without the owner's
visual acceptance.

## What is ready to review

| Repo | Draft PR | Result | Evidence and limits |
| --- | --- | --- | --- |
| Linefield | [#29 Lacuna](https://github.com/Classiccottrell/linefield/pull/29) | New movable calm zone and five distinct presets. | Focused presets, build and all fourteen controls passed. Owner has not visually accepted it. |
| Linefield | [#31 Synapse](https://github.com/Classiccottrell/linefield/pull/31) | Two connected node clouds replace faint random scatter; copy, thumbnail and bake refreshed. | Five-preset sheet, build and all fifteen controls passed. Default ink rose from 0.047 to 0.163; judge whether that visual weight is right. |
| Forma | [#39 preset polish](https://github.com/Classiccottrell/forma/pull/39) | Ten preset cards use captures of their actual scenes. Four previously weak presets have revised compositions. | 173 library tests and app build passed. Contact sheet is `/tmp/forma-preset-sheet.png`; source capture command is `cd /home/matt/forma/app && npm run presets:capture` with the app dev server on port 5183. Owner has not accepted the looks. |
| Linefield | [#30 production roadmap](https://github.com/Classiccottrell/linefield/pull/30) | Proposed L0–L7 backlog, all eighteen pieces grouped for visual review. | Planning only. |
| Forma | [#38 production roadmap](https://github.com/Classiccottrell/forma/pull/38) | Proposed F0–F7 backlog, with ten React Bits source examples and two tools. | Planning only. |

Implementation branches are `codex/synapse-art-direction` in
`/home/matt/linefield` and `codex/preset-preview-polish` in `/home/matt/forma`.
The untracked `.claude/` directories predate this work; leave them alone.
Roadmap branches are `codex/react-bits-roadmap` in each repo. Linefield PRs
#29, #30 and #31 all touch `ROADMAP.md`, so rebase the later branch after
merging an earlier one and reconcile the handoff notes rather than choosing one
version of the file wholesale.

## Research boundary

React Bits source snapshot: `DavidHDev/react-bits@37f53df7efb61238b0fea9ea8be74e3cce62b959`.
Reviewed Aurora, Silk, Letter Glitch, Floating Lines, Split Text, Blur Text,
Click Spark, Magnet, Spotlight Card and Tilted Card, plus Background Studio
and Shape Magic structure. This was a ten-piece cross-section, not a full-site
audit. The REA skill is at `https://github.com/morluto/rea`; the earlier CLI
attempt was blocked by Node 24.21.0, but this environment now reports Node
24.22.3, so the CLI may be usable. Source inspection already supports the
current roadmap; use the skill when extending the comparison.

## Next work, in order

1. **Get owner visual review of #29, #31 and #39.** Judge Lacuna and Synapse
   at the shipped gallery card size and inspect all five presets and motion.
   For Forma, inspect all ten real preset captures at picker size and compare
   a selection with the actual editor scene. The images exposed weak
   compositions that CSS swatches had concealed; do not assume all remaining
   presets are now strong simply because they render.
2. **Resolve the cross-project `funnel` mismatch (L0/F0).** Forma's
   `src/content/composedScenes.ts` and its homepage/export use `funnel`, but
   Linefield's current `pieces.json` has eighteen pieces and no `funnel`.
   Forma can still build against a published or vendored old bake, which hides
   the mismatch. Recommend re-authoring `Into the Well` against current
   `event-horizon` unless the owner explicitly wants Funnel restored. Verify
   the public slug, shared-current reaction, standalone export and homepage.
3. **Continue Linefield one named piece at a time.** Read `AGENTS.md`, then
   `ROADMAP.md` and `CONTRIBUTING.md`. Next candidates from the current contact
   sheet are `grain-field` or `cipher-bloom`. For each, create a before/after
   gallery capture, run `node tools/preset-sheet.mjs <slug>`, inspect all five
   looks, rebuild thumbnail/bake, run focused preset and control checks, and
   hand it to the owner for visual review. Do not simply brighten `rainfall`:
   its left-third ink limit protects homepage text and is explicit in the
   roadmap and source.
4. **Continue Forma content quality before adding shapes.** The catalog cap
   is thirty. Use F1's neutral contact sheet for every shape, then review
   representative Solid/Liquid/Gas and material/environment combinations.
   Prioritize silhouettes, reflections, contact shadow and material identity.
   Replace CSS approximations in other pickers only where the real image helps
   selection. Keep capture assets reproducible and add a stale-image check.
5. **Production release work follows visual curation.** Context previews with
   foreground text, explicit motion states, reduced-motion stills, export
   parity and actual-device performance/accessibility checks are in the two
   draft roadmaps. A pixel-variance gate or passing build is not visual
   acceptance.

## Verification already completed

- Forma library build and 173 tests passed; app typecheck/production build
  passed and included all ten preset PNGs (about 220 KB combined).
- Synapse manifest verification, five-preset test, full asset build, and
  fifteen-control focused audit passed; the generated thumbnail was inspected.
- The only unrelated working-tree contents are the pre-existing `.claude/`
  directories. No merges or deployments were made.
