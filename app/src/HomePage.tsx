import { useEffect, useRef, useState } from 'react';
import { scenes } from 'virtual:forma-scenes';
import { BASE_URL, EDITOR_PATH } from './base';
import { useReducedMotion } from './hooks/useReducedMotion';
import './home.css';

const SOURCE_URL = 'https://github.com/Classiccottrell/forma';
const LINEFIELD_URL = 'https://classiccottrell.github.io/linefield/';
const scenePage = (id: string) => `${BASE_URL}scenes/${id}.html`;
const still = (name: string) => `${BASE_URL}home/${name}.jpg`;

const FORMS = [
  { id: 'solid', name: 'Solid', text: 'Holds its shape. Push further and the surface cracks away in patches.' },
  { id: 'liquid', name: 'Liquid', text: 'Melts, pools and runs back together.' },
  { id: 'gas', name: 'Gas', text: 'Thins into a cloud that drifts and gathers again.' },
] as const;

const WAYS_OUT = [
  { name: 'A transparent PNG', text: 'At 1×, 2× or 4×, with or without the backdrop.' },
  { name: 'A live embed', text: 'One snippet. It loads when it nears the screen, pauses when it leaves, and follows the pointer and the scroll.' },
  { name: 'On a field of lines', text: 'One HTML file: a linefield background and your object, moving in the same current.' },
] as const;

/** The homepage: the composed scenes, running. The hero plays one scene page
 * (`scenes/<id>.html`, built by app/vite.config.ts) in a frame; the cards under it switch
 * scenes. The frame is unloaded while the hero is off screen (hiding it would leave both
 * animation loops running; the still behind it covers the reload), and under reduced
 * motion the still stands in until the visitor asks for the live scene. This page loads none of the
 * 3D code itself. */
export default function HomePage() {
  const reducedMotion = useReducedMotion();
  const [sceneId, setSceneId] = useState(scenes[0]!.id);
  const [live, setLive] = useState(!reducedMotion);
  const [inView, setInView] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0]!;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => setInView(entries[entries.length - 1]!.isIntersecting));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hp">
      <a className="skip-link" href="#hp-main">Skip to content</a>
      <header className="hp-nav">
        <a className="brand" href={BASE_URL} aria-label="Forma home">for<em>ma</em></a>
        <nav aria-label="Site">
          <a href="#scenes">Scenes</a>
          <a href={SOURCE_URL}>Source</a>
          <a className="hp-nav-cta" href={EDITOR_PATH}>Open the editor <span aria-hidden="true">→</span></a>
        </nav>
      </header>

      <main id="hp-main">
        <section className="hp-hero" aria-labelledby="hp-title">
          <div className="hp-stage" ref={stageRef} style={{ backgroundImage: `url(${still(`scene-${scene.id}`)})` }}>
            {live && inView && (
              <iframe
                key={scene.id}
                className="hp-frame"
                src={scenePage(scene.id)}
                title={`${scene.name}, a live scene: a Forma object on linefield's ${scene.piece}`}
                tabIndex={-1}
              />
            )}
          </div>
          <div className="hp-hero-copy">
            <p className="hp-eyebrow">Forma · a shape lab in the browser</p>
            <h1 id="hp-title">Shapes that come apart, <i>and come back.</i></h1>
            <p className="hp-lede">Pick a form and a finish. Make it solid, liquid or gas. Then set it loose on your own page, alone or inside a field of lines.</p>
            <div className="hp-actions">
              <a className="hp-button" href={EDITOR_PATH}>Open the editor <span aria-hidden="true">→</span></a>
              {!live && <button type="button" className="hp-button hp-button--quiet" onClick={() => setLive(true)}>Run the live scene</button>}
            </div>
          </div>
          <p className="hp-now">
            <span>Now running</span> {scene.name} <a href={scenePage(scene.id)}>Open it on its own <span aria-hidden="true">↗</span></a>
          </p>
        </section>

        <section className="hp-section" id="scenes" aria-labelledby="hp-scenes-title">
          <div className="hp-section-head">
            <h2 id="hp-scenes-title">Three scenes, built with the export menu</h2>
            <p>Each is a Forma object over a <a href={LINEFIELD_URL}>linefield</a> background. The lines make room for the object, and its matter rides their flow.</p>
          </div>
          <ul className="hp-scenes">
            {scenes.map((s) => (
              <li key={s.id}>
                <button type="button" className="hp-scene" aria-pressed={s.id === scene.id} onClick={() => { setSceneId(s.id); stageRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); }}>
                  <img src={still(`scene-${s.id}`)} alt="" width={1280} height={720} loading="lazy" />
                  <span className="hp-scene-piece">On {s.piece}</span>
                  <strong>{s.name}</strong>
                  <span className="hp-scene-blurb">{s.blurb}</span>
                  <span className="hp-scene-state">{s.id === scene.id ? 'Showing above' : 'Show this scene'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="hp-section" aria-labelledby="hp-forms-title">
          <div className="hp-section-head">
            <h2 id="hp-forms-title">One shape, three states</h2>
            <p>Any of the thirty shapes can turn into matter. A slider takes it apart. So can a loop, the pointer, or the page's scroll.</p>
          </div>
          <ul className="hp-forms">
            {FORMS.map((form) => (
              <li key={form.id}>
                <img src={still(`form-${form.id}`)} alt={`A gold blob as a ${form.id}`} width={640} height={640} loading="lazy" />
                <h3>{form.name}</h3>
                <p>{form.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="hp-section" aria-labelledby="hp-out-title">
          <div className="hp-section-head">
            <h2 id="hp-out-title">Three ways out</h2>
            <p>Nothing uploads, and there is no account. The editor runs on your machine.</p>
          </div>
          <ul className="hp-ways">
            {WAYS_OUT.map((way) => (
              <li key={way.name}><h3>{way.name}</h3><p>{way.text}</p></li>
            ))}
          </ul>
          <a className="hp-button" href={EDITOR_PATH}>Open the editor <span aria-hidden="true">→</span></a>
        </section>
      </main>

      <footer className="hp-footer">
        <span>Forma · MIT licensed</span>
        <span><a href={SOURCE_URL}>Source on GitHub</a> · <a href={LINEFIELD_URL}>linefield</a></span>
      </footer>
    </div>
  );
}
