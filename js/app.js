(() => {
  gsap.registerPlugin(ScrollTrigger);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = document.querySelector(".scene");
  const photo = document.getElementById("scene-photo");
  const hitPlate = document.querySelector(".plate-hit");
  const veil = document.getElementById("scene-veil");
  const heroCopy = document.getElementById("hero-copy");
  const throwCopy = document.getElementById("throw-copy");
  const axe = document.getElementById("axe");
  const impact = document.getElementById("impact");
  const progress = document.getElementById("progress");
  const line = document.getElementById("line");

  if (!scene || !axe) return;

  const lines = [
    "دست را عقب ببر",
    "رها کن — می‌چرخد",
    "مسیر هوایی",
    "نزدیک مرکز",
    "بولزآی.",
  ];

  gsap.set(axe, {
    left: "18%",
    top: "68%",
    xPercent: -50,
    yPercent: -50,
    rotate: -24,
    scale: 0.95,
    opacity: 0,
  });
  gsap.set(throwCopy, { opacity: 0 });
  gsap.set(hitPlate, { opacity: 0 });

  if (reduce) {
    gsap.set([axe, heroCopy], { opacity: 1 });
    gsap.set(hitPlate, { opacity: 1 });
    return;
  }

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: scene,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.65,
      onUpdate: (self) => {
        const p = self.progress;
        if (progress) progress.style.width = `${Math.max(0, (p - 0.16) / 0.84) * 100}%`;
        if (p < 0.16) {
          if (line) line.textContent = "";
        } else {
          const t = (p - 0.16) / 0.84;
          const i = Math.min(lines.length - 1, Math.floor(t * 0.999 * lines.length));
          if (line && line.textContent !== lines[i]) line.textContent = lines[i];
        }
      },
    },
  });

  // Parallax photo slides continuously (same full-bleed frame)
  tl.to(photo, { yPercent: 10, scale: 1.08, duration: 1.1 }, 0);
  tl.to(heroCopy, { opacity: 0, y: -36, duration: 0.5 }, 0.75);
  tl.to(veil, { opacity: 0.45, duration: 0.6 }, 0.6);

  tl.to(axe, { opacity: 1, duration: 0.2 }, 1.0);
  tl.to(throwCopy, { opacity: 1, duration: 0.3 }, 1.05);

  // wind-up
  tl.to(axe, { left: "12%", top: "74%", rotate: -48, scale: 1.02, duration: 0.85 }, 1.15);
  tl.to(photo, { yPercent: 16, scale: 1.12, duration: 0.85 }, 1.15);
  tl.to(veil, { opacity: 0.28, duration: 0.85 }, 1.15);

  // release + spin
  tl.to(axe, { left: "28%", top: "50%", rotate: 220, scale: 1.08, duration: 1.2 }, 2.0);
  tl.to(photo, { yPercent: 24, scale: 1.16, duration: 1.2 }, 2.0);
  tl.to(veil, { opacity: 0.16, duration: 1.2 }, 2.0);

  // mid-air
  tl.to(axe, { left: "44%", top: "45%", rotate: 520, scale: 0.95, duration: 1.25 }, 3.2);
  tl.to(photo, { yPercent: 32, scale: 1.2, duration: 1.25 }, 3.2);
  tl.to(veil, { opacity: 0.1, duration: 1.25 }, 3.2);

  // approach
  tl.to(axe, { left: "54%", top: "43%", rotate: 700, scale: 0.72, duration: 1.1 }, 4.45);
  tl.to(photo, { yPercent: 38, scale: 1.24, duration: 1.1 }, 4.45);
  tl.to(veil, { opacity: 0.06, duration: 1.1 }, 4.45);

  // IMPACT — crossfade to real photo with axe stuck
  tl.to(axe, { left: "56%", top: "43%", rotate: 735, scale: 0.55, duration: 0.35 }, 5.55);
  tl.fromTo(impact, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 14, duration: 0.3 }, 5.65);
  tl.to(impact, { opacity: 0, duration: 0.4 }, 5.95);
  tl.to(hitPlate, { opacity: 1, duration: 0.25 }, 5.7);
  tl.to(axe, { opacity: 0, duration: 0.25 }, 5.72);
  tl.fromTo(".scene-sticky", { x: 0 }, { x: 4, duration: 0.05, yoyo: true, repeat: 5 }, 5.65);
  tl.to(photo, { yPercent: 40, scale: 1.26, duration: 0.55 }, 5.55);
  tl.to(veil, { opacity: 0.2, duration: 0.55 }, 5.55);
  tl.to({}, { duration: 0.75 }, 6.1);

  gsap.from(".exp-rows > div", {
    y: 30,
    opacity: 0,
    stagger: 0.1,
    duration: 0.8,
    ease: "power3.out",
    scrollTrigger: { trigger: ".exp-rows", start: "top 82%" },
  });

  const form = document.getElementById("form");
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
})();
