# Iran Axe Throwing

لندینگ اسکرول‌محور با **موتور سه‌بعدی Three.js** کاملاً مجازی — بدون عکس واقعی.

**Live:** https://moh3nfa.github.io/axe/

**Repo:** https://github.com/moh3nfa/axe

## Run

```bash
python3 -m http.server 8765
# http://127.0.0.1:8765
```

## Stack

- Three.js `0.170` — procedural target, axe, lighting (`js/engine.js`)
- GSAP + ScrollTrigger (`js/app.js`)
- RTL Persian + English brand

## Features

- Sticky full-viewport WebGL scene
- Scroll-driven camera orbit
- Fully procedural wooden target + painted rings
- Procedural 3D axe flight (blade sticks in wood, handle stays out)
