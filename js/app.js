(() => {
  gsap.registerPlugin(ScrollTrigger);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.from(".hero-text > *", {
    y: 28,
    opacity: 0,
    duration: 1,
    stagger: 0.1,
    ease: "power3.out",
    delay: 0.08,
  });

  if (!reduce) {
    gsap.utils.toArray(".px-axe").forEach((el) => {
      const y = parseFloat(el.dataset.y || "0.3");
      const r = parseFloat(el.dataset.r || "360");
      gsap.to(el, {
        y: () => -innerHeight * y * 2.2,
        rotation: r,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });
    });

    gsap.to(".hero-photo", {
      yPercent: 16,
      scale: 1.14,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  }

  const axe = document.getElementById("throw-axe");
  const target = document.querySelector(".target-block");
  const impact = document.querySelector(".impact");
  const progress = document.getElementById("progress");
  const line = document.getElementById("line");
  const section = document.querySelector(".throw");
  if (!axe || !section) return;

  const lines = [
    "دست را عقب ببر",
    "رها کن — می‌چرخد",
    "مسیر هوایی",
    "نزدیک مرکز",
    "بولزآی.",
  ];

  gsap.set(axe, {
    left: "14%",
    top: "74%",
    xPercent: -50,
    yPercent: -50,
    rotate: -62,
    scale: 0.9,
  });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.75,
      onUpdate: (self) => {
        if (progress) progress.style.width = `${self.progress * 100}%`;
        const i = Math.min(lines.length - 1, Math.floor(self.progress * 0.999 * lines.length));
        if (line && line.textContent !== lines[i]) line.textContent = lines[i];
      },
    },
  });

  tl.to(axe, { left: "10%", top: "78%", rotate: -108, scale: 0.96, duration: 1 }, 0);
  tl.to(target, { scale: 0.88, filter: "brightness(0.55) saturate(0.8)", duration: 1 }, 0);

  tl.to(axe, { left: "28%", top: "54%", rotate: 240, scale: 1.1, duration: 1.35 }, 1);
  tl.to(target, { scale: 0.94, filter: "brightness(0.75) saturate(0.9)", duration: 1.35 }, 1);

  tl.to(axe, { left: "45%", top: "48%", rotate: 590, scale: 0.95, duration: 1.4 }, 2.35);
  tl.to(target, { scale: 1.0, filter: "brightness(0.95) saturate(1)", duration: 1.4 }, 2.35);

  tl.to(axe, { left: "50%", top: "47%", rotate: 720, scale: 0.66, duration: 1.15 }, 3.75);
  tl.to(target, { scale: 1.03, filter: "brightness(1.05) saturate(1.05)", duration: 1.15 }, 3.75);

  tl.to(axe, { left: "52%", top: "46%", rotate: 745, scale: 0.5, duration: 0.4 }, 4.9);
  tl.fromTo(impact, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 11, duration: 0.35 }, 5.05);
  tl.to(impact, { opacity: 0, duration: 0.5 }, 5.4);
  tl.fromTo(".throw-sticky", { x: 0 }, { x: 5, duration: 0.05, yoyo: true, repeat: 6 }, 5.05);
  // blend into the real embedded axe in the photo
  tl.to(axe, { opacity: 0, scale: 0.42, duration: 0.35 }, 5.15);
  tl.to(target, { filter: "brightness(1.08) saturate(1.08)", duration: 0.35 }, 5.15);
  tl.to({}, { duration: 0.8 }, 5.5);

  if (!reduce) {
    gsap.from(".exp-rows > div", {
      y: 34,
      opacity: 0,
      stagger: 0.12,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: { trigger: ".exp-rows", start: "top 82%" },
    });
    gsap.from(".strip h2", {
      scale: 0.92,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: ".strip", start: "top 70%" },
    });
  }

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
