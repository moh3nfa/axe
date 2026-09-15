(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.registerPlugin(ScrollTrigger);

  const axe = document.getElementById("axe");
  const axeStage = document.getElementById("axe-stage");
  const targetStage = document.querySelector(".target-stage");
  const chapters = gsap.utils.toArray(".chapter");
  const progressFill = document.getElementById("progress-fill");
  const impactBurst = document.querySelector(".impact-burst");
  const impactRing = document.querySelector(".impact-ring");
  const trail = document.querySelector(".trail");
  const throwSection = document.querySelector(".throw-section");

  if (!axe || !throwSection) return;

  // Hero subtle parallax
  if (!reduceMotion) {
    gsap.to(".hero-bg", {
      yPercent: 18,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

    gsap.from(".exp-block", {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".exp-grid",
        start: "top 80%",
      },
    });

    gsap.from(".pulse-inner", {
      scale: 0.94,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".pulse",
        start: "top 70%",
      },
    });
  }

  // Main throw narrative
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: throwSection,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.65,
      onUpdate: (self) => {
        if (progressFill) {
          progressFill.style.width = `${self.progress * 100}%`;
        }
      },
    },
  });

  // Initial axe pose (held back)
  gsap.set(axe, {
    xPercent: -50,
    yPercent: -50,
    left: "18%",
    top: "68%",
    rotate: -48,
    scale: 0.85,
  });

  gsap.set(chapters, { opacity: 0, y: 18 });
  gsap.set(chapters[0], { opacity: 1, y: 0 });

  const showChapter = (index, at) => {
    chapters.forEach((el, i) => {
      if (i === index) {
        tl.to(el, { opacity: 1, y: 0, duration: 0.28 }, at);
      } else {
        tl.to(el, { opacity: 0, y: i < index ? -14 : 14, duration: 0.22 }, at);
      }
    });
  };

  // 0 → wind up
  tl.to(
    axe,
    {
      left: "12%",
      top: "74%",
      rotate: -82,
      scale: 0.92,
      duration: 1,
    },
    0
  );
  tl.to(targetStage, { opacity: 0.62, filter: "blur(1.2px) brightness(0.78)", duration: 1 }, 0);

  showChapter(1, 0.85);

  // 1 → release + spin through air
  tl.to(
    axe,
    {
      left: "28%",
      top: "52%",
      rotate: 220,
      scale: 1.05,
      duration: 1.25,
    },
    1
  );
  tl.to(
    trail,
    {
      opacity: 0.75,
      left: "18%",
      top: "50%",
      width: 180,
      rotate: -18,
      duration: 0.7,
    },
    1.05
  );
  tl.to(targetStage, { scale: 0.96, opacity: 0.82, filter: "blur(0.6px) brightness(0.88)", duration: 1.25 }, 1);

  showChapter(2, 2.05);

  // 2 → mid-flight approach
  tl.to(
    axe,
    {
      left: "46%",
      top: "47%",
      rotate: 560,
      scale: 0.95,
      duration: 1.35,
    },
    2.2
  );
  tl.to(
    trail,
    {
      left: "34%",
      top: "46%",
      width: 130,
      opacity: 0.4,
      duration: 1,
    },
    2.2
  );
  tl.to(
    targetStage,
    {
      scale: 1.01,
      opacity: 1,
      filter: "blur(0px) brightness(1)",
      duration: 1.35,
    },
    2.2
  );

  showChapter(3, 3.3);

  // 3 → final approach to bullseye
  tl.to(
    axe,
    {
      left: "50%",
      top: "48%",
      rotate: 700,
      scale: 0.7,
      duration: 1.05,
    },
    3.5
  );
  tl.to(trail, { opacity: 0, duration: 0.35 }, 3.65);

  showChapter(4, 4.35);

  // 4 → IMPACT — stick into bullseye
  tl.to(
    axe,
    {
      left: "50%",
      top: "48%",
      rotate: 725,
      scale: 0.58,
      duration: 0.4,
    },
    4.55
  );

  tl.fromTo(
    impactBurst,
    { opacity: 0, scale: 0.15 },
    { opacity: 1, scale: 9, duration: 0.32 },
    4.72
  );
  tl.to(impactBurst, { opacity: 0, duration: 0.5 }, 5.05);

  tl.fromTo(
    impactRing,
    { opacity: 0, scale: 0.35 },
    { opacity: 0.95, scale: 11, duration: 0.55 },
    4.74
  );
  tl.to(impactRing, { opacity: 0, duration: 0.45 }, 5.2);

  tl.fromTo(
    ".venue",
    { x: 0, y: 0 },
    { x: 7, y: -5, duration: 0.07, yoyo: true, repeat: 4 },
    4.72
  );

  // settle / stuck
  tl.to(axe, { scale: 0.56, rotate: 728, duration: 0.35 }, 5.05);
  tl.to({}, { duration: 0.85 }, 5.25);

  // Experience / book form nicety
  const form = document.querySelector(".book-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button");
      const original = btn.textContent;
      btn.textContent = "درخواست ثبت شد ✓";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        form.reset();
      }, 2400);
    });
  }

  // Header blend tweak when over dark sections
  ScrollTrigger.create({
    trigger: throwSection,
    start: "top top",
    end: "bottom top",
    onEnter: () => document.body.classList.add("on-dark"),
    onLeave: () => document.body.classList.remove("on-dark"),
    onEnterBack: () => document.body.classList.add("on-dark"),
    onLeaveBack: () => document.body.classList.remove("on-dark"),
  });
})();
