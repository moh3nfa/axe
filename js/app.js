import { createThrowEngine } from "./engine.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById("webgl");
const sceneEl = document.getElementById("scene");
const header = document.getElementById("header");
const progress = document.getElementById("progress");
const line = document.getElementById("line");
const form = document.getElementById("form");

const lines = [
  "دست را عقب ببر",
  "رها کن — می‌چرخد",
  "زاویه دوربین",
  "نزدیک مرکز",
  "بولزآی.",
];

if (!canvas || !sceneEl) {
  console.error("Missing #webgl or #scene");
} else {
  const engine = createThrowEngine(canvas);

  ScrollTrigger.create({
    start: 40,
    onUpdate: (self) => {
      header?.classList.toggle("is-solid", self.scroll() > 40);
    },
  });

  ScrollTrigger.create({
    trigger: sceneEl,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.65,
    onUpdate: (self) => {
      const p = self.progress;
      engine.setProgress(p);
      if (progress) progress.style.width = `${Math.max(0, (p - 0.16) / 0.84) * 100}%`;
      if (p < 0.16) {
        if (line) line.textContent = "";
      } else {
        const t = (p - 0.16) / 0.84;
        const i = Math.min(lines.length - 1, Math.floor(t * 0.999 * lines.length));
        if (line && line.textContent !== lines[i]) line.textContent = lines[i];
      }
    },
  });

  // kick first frame sizing
  requestAnimationFrame(() => engine.resize());
}

gsap.from(".hero-copy > *", {
  y: 32,
  opacity: 0,
  duration: 1.1,
  stagger: 0.08,
  ease: "power3.out",
  delay: 0.15,
});

gsap.from(".exp-rows article", {
  y: 40,
  opacity: 0,
  stagger: 0.12,
  duration: 0.9,
  ease: "power3.out",
  scrollTrigger: { trigger: ".exp-rows", start: "top 80%" },
});

gsap.from(".strip h2", {
  y: 28,
  opacity: 0,
  duration: 1,
  ease: "power3.out",
  scrollTrigger: { trigger: ".strip", start: "top 70%" },
});

gsap.from(".book-card", {
  y: 36,
  opacity: 0,
  duration: 1,
  ease: "power3.out",
  scrollTrigger: { trigger: ".book", start: "top 75%" },
});

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    const t = btn.textContent;
    btn.textContent = "ثبت شد ✓";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = t;
      btn.disabled = false;
      form.reset();
    }, 2200);
  });
}
