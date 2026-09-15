(() => {
  gsap.registerPlugin(ScrollTrigger);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.getElementById("header");
  const scene = document.querySelector(".scene");
  const camera = document.getElementById("camera");
  const photo = document.getElementById("scene-photo");
  const hitPlate = document.querySelector(".plate-hit");
  const veil = document.getElementById("scene-veil");
  const heroCopy = document.getElementById("hero-copy");
  const throwCopy = document.getElementById("throw-copy");
  const axe = document.getElementById("axe");
  const impact = document.getElementById("impact");
  const progress = document.getElementById("progress");
  const line = document.getElementById("line");

  if (!scene || !axe || !camera) return;

  const lines = [
    "دست را عقب ببر",
    "رها کن — می‌چرخد",
    "مسیر هوایی",
    "نزدیک مرکز",
    "بولزآی.",
  ];

  ScrollTrigger.create({
    start: 40,
    onUpdate: (self) => {
      header?.classList.toggle("is-solid", self.scroll() > 40);
    },
  });

  if (!reduce) {
    gsap.from(".hero-copy > *", {
      y: 36,
      opacity: 0,
      duration: 1.15,
      stagger: 0.09,
      ease: "power3.out",
      delay: 0.12,
    });
  }

  gsap.set(camera, {
    rotateY: 0,
    rotateX: 0,
    z: 0,
    xPercent: 0,
    yPercent: 0,
    force3D: true,
  });

  gsap.set(axe, {
    left: "16%",
    top: "70%",
    xPercent: -50,
    yPercent: -50,
    rotate: -40,
    rotateY: 0,
    rotateX: 0,
    scale: 0.95,
    opacity: 0,
    force3D: true,
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
      scrub: 0.75,
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

  // ─── HERO hold: camera almost flat
  tl.to(photo, { yPercent: 8, scale: 1.06, duration: 1.0 }, 0);
  tl.to(camera, { rotateY: -4, rotateX: 2, z: -40, duration: 1.0 }, 0);
  tl.to(heroCopy, { opacity: 0, y: -40, filter: "blur(6px)", duration: 0.55 }, 0.7);
  tl.to(veil, { opacity: 0.38, duration: 0.55 }, 0.55);

  // axe enters as we start thrower POV
  tl.to(axe, { opacity: 1, duration: 0.22 }, 0.95);
  tl.to(throwCopy, { opacity: 1, duration: 0.35 }, 1.0);

  // ─── WIND-UP: camera over shoulder (from thrower side)
  tl.to(
    camera,
    {
      rotateY: 14,
      rotateX: 6,
      z: -120,
      xPercent: -3,
      yPercent: 1,
      duration: 0.9,
    },
    1.1
  );
  tl.to(axe, { left: "11%", top: "76%", rotate: -85, rotateY: 18, scale: 1.05, duration: 0.9 }, 1.1);
  tl.to(photo, { yPercent: 14, scale: 1.12, duration: 0.9 }, 1.1);
  tl.to(veil, { opacity: 0.28, duration: 0.9 }, 1.1);

  // ─── RELEASE: camera swings with the throw (orbit)
  tl.to(
    camera,
    {
      rotateY: -6,
      rotateX: 1,
      z: -60,
      xPercent: 1,
      yPercent: 0,
      duration: 1.25,
    },
    2.0
  );
  tl.to(
    axe,
    {
      left: "30%",
      top: "50%",
      rotate: 280,
      rotateY: -25,
      rotateX: 12,
      scale: 1.15,
      duration: 1.25,
    },
    2.0
  );
  tl.to(photo, { yPercent: 22, scale: 1.16, duration: 1.25 }, 2.0);
  tl.to(veil, { opacity: 0.14, duration: 1.25 }, 2.0);

  // ─── MID-FLIGHT: dramatic low/side angle following axe
  tl.to(
    camera,
    {
      rotateY: -16,
      rotateX: -5,
      z: 40,
      xPercent: 4,
      yPercent: -2,
      duration: 1.3,
    },
    3.25
  );
  tl.to(
    axe,
    {
      left: "45%",
      top: "45%",
      rotate: 580,
      rotateY: 40,
      rotateX: -8,
      scale: 1.0,
      duration: 1.3,
    },
    3.25
  );
  tl.to(photo, { yPercent: 30, scale: 1.2, duration: 1.3 }, 3.25);
  tl.to(veil, { opacity: 0.08, duration: 1.3 }, 3.25);

  // ─── APPROACH: camera pushes into bullseye (dolly in)
  tl.to(
    camera,
    {
      rotateY: -4,
      rotateX: 0,
      z: 160,
      xPercent: 1,
      yPercent: 0,
      duration: 1.15,
    },
    4.55
  );
  tl.to(
    axe,
    {
      left: "53%",
      top: "43%",
      rotate: 720,
      rotateY: 8,
      rotateX: 0,
      scale: 0.72,
      duration: 1.15,
    },
    4.55
  );
  tl.to(photo, { yPercent: 36, scale: 1.24, duration: 1.15 }, 4.55);
  tl.to(veil, { opacity: 0.05, duration: 1.15 }, 4.55);

  // ─── IMPACT: snap camera square-on + punch
  tl.to(
    camera,
    {
      rotateY: 0,
      rotateX: 0,
      z: 220,
      xPercent: 0,
      yPercent: 0,
      duration: 0.38,
    },
    5.7
  );
  tl.to(
    axe,
    {
      left: "55%",
      top: "43%",
      rotate: 748,
      rotateY: 0,
      scale: 0.5,
      duration: 0.35,
    },
    5.7
  );
  tl.fromTo(impact, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 16, duration: 0.3 }, 5.82);
  tl.to(impact, { opacity: 0, duration: 0.4 }, 6.1);
  tl.to(hitPlate, { opacity: 1, duration: 0.25 }, 5.85);
  tl.to(axe, { opacity: 0, duration: 0.25 }, 5.88);
  tl.fromTo(camera, { x: 0 }, { x: 5, duration: 0.05, yoyo: true, repeat: 5 }, 5.82);
  tl.to(photo, { yPercent: 38, scale: 1.28, duration: 0.5 }, 5.7);
  tl.to(veil, { opacity: 0.2, duration: 0.5 }, 5.7);

  // settle
  tl.to(camera, { z: 80, duration: 0.55 }, 6.2);
  tl.to({}, { duration: 0.55 }, 6.4);

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
