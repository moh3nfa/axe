/**
 * Iran Axe Throwing — fully procedural Three.js scroll engine
 * Real hatchet proportions (blade ⊥ handle). No photos.
 */
import * as THREE from "three";

export function createThrowEngine(canvas) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0908, 0.022);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0908, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 1.2, 6.5);

  scene.add(new THREE.AmbientLight(0xfff0e0, 0.42));

  const key = new THREE.DirectionalLight(0xffe2c8, 2.2);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x88aaff, 0.55);
  rim.position.set(-6, 3, -4);
  scene.add(rim);

  const warm = new THREE.PointLight(0xff5533, 16, 22, 2);
  warm.position.set(0, 2.5, 2.2);
  scene.add(warm);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({
      color: 0x14100c,
      roughness: 0.96,
      metalness: 0.04,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.6;
  ground.receiveShadow = true;
  scene.add(ground);

  // —— Target ——
  const BULL = new THREE.Vector3(0.12, 1.55, 0.02);
  const WALL_Z = 0.02;
  const targetGroup = new THREE.Group();
  scene.add(targetGroup);
  buildVirtualTarget(targetGroup, BULL);

  // —— Real hatchet (blade ⊥ handle) ——
  const axe = buildHatchet();
  axe.visible = false;
  scene.add(axe);

  const axeLight = new THREE.PointLight(0xffe0c0, 28, 10, 1.6);
  scene.add(axeLight);
  const axeRim = new THREE.PointLight(0x88aaff, 10, 6, 2);
  scene.add(axeRim);

  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffe8d0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), flashMat);
  flash.position.copy(BULL).add(new THREE.Vector3(0, 0, 0.1));
  scene.add(flash);

  const chips = buildChips();
  chips.visible = false;
  chips.position.copy(BULL);
  scene.add(chips);

  const state = { progress: 0 };
  const stuckScale = 1.0;

  // Local landmarks on the hatchet group
  // Handle along +Y (head) / −Y (grip). Blade tip at +X.
  const BLADE_TIP = new THREE.Vector3(0.88, 0.48, 0);
  const EYE = new THREE.Vector3(0.0, 0.4, 0);
  const GRIP = new THREE.Vector3(0, -1.25, 0);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener("resize", resize);

  function setProgress(p) {
    state.progress = THREE.MathUtils.clamp(p, 0, 1);
    const t = state.progress;

    let yaw, pitch, radius, lookY, fov;
    let axePhase = null;
    let axeK = 0;

    if (t < 0.18) {
      const k = t / 0.18;
      yaw = THREE.MathUtils.lerp(0.12, 0.32, k);
      pitch = THREE.MathUtils.lerp(0.08, 0.12, k);
      radius = THREE.MathUtils.lerp(6.5, 6.0, k);
      lookY = 1.4;
      fov = 42;
      axe.visible = false;
      heroFade(1 - k * 0.12);
      throwFade(0);
      flash.material.opacity = 0;
      chips.visible = false;
    } else if (t < 0.32) {
      const k = (t - 0.18) / 0.14;
      yaw = THREE.MathUtils.lerp(0.32, 0.95, easeInOut(k));
      pitch = THREE.MathUtils.lerp(0.12, 0.24, k);
      radius = THREE.MathUtils.lerp(6.0, 5.0, k);
      lookY = THREE.MathUtils.lerp(1.4, 1.05, k);
      fov = THREE.MathUtils.lerp(42, 39, k);
      axe.visible = true;
      axePhase = "windup";
      axeK = k;
      heroFade(1 - k);
      throwFade(k);
    } else if (t < 0.55) {
      const k = (t - 0.32) / 0.23;
      yaw = THREE.MathUtils.lerp(0.95, -0.4, easeInOut(k));
      pitch = THREE.MathUtils.lerp(0.24, 0.04, k);
      radius = THREE.MathUtils.lerp(5.0, 4.2, k);
      lookY = THREE.MathUtils.lerp(1.05, 1.4, k);
      fov = THREE.MathUtils.lerp(39, 36, k);
      axe.visible = true;
      axePhase = "release";
      axeK = k;
      heroFade(0);
      throwFade(1);
    } else if (t < 0.75) {
      const k = (t - 0.55) / 0.2;
      yaw = THREE.MathUtils.lerp(-0.4, -0.85, easeInOut(k));
      pitch = THREE.MathUtils.lerp(0.04, -0.06, k);
      radius = THREE.MathUtils.lerp(4.2, 3.6, k);
      lookY = THREE.MathUtils.lerp(1.4, 1.5, k);
      fov = THREE.MathUtils.lerp(36, 34, k);
      axe.visible = true;
      axePhase = "flight";
      axeK = k;
      heroFade(0);
      throwFade(1);
    } else if (t < 0.9) {
      const k = (t - 0.75) / 0.15;
      yaw = THREE.MathUtils.lerp(-0.85, 0.15, easeInOut(k));
      pitch = THREE.MathUtils.lerp(-0.06, 0.1, k);
      radius = THREE.MathUtils.lerp(3.6, 3.0, k);
      lookY = 1.5;
      fov = THREE.MathUtils.lerp(34, 33, k);
      axe.visible = true;
      axePhase = "approach";
      axeK = k;
      heroFade(0);
      throwFade(1);
    } else {
      const k = (t - 0.9) / 0.1;
      // Side-ish view so handle at clock 1:30 reads clearly
      yaw = THREE.MathUtils.lerp(0.15, 0.55, easeOut(k));
      pitch = THREE.MathUtils.lerp(0.1, 0.14, k);
      radius = THREE.MathUtils.lerp(3.0, 2.85, easeOut(k));
      lookY = 1.45;
      fov = THREE.MathUtils.lerp(33, 34, k);
      axe.visible = true;
      axePhase = "impact";
      axeK = k;
      heroFade(0);
      throwFade(1);
      flash.material.opacity = Math.sin(Math.min(k, 1) * Math.PI) * 0.75;
      chips.visible = k > 0.12;
      chips.scale.setScalar(0.5 + k * 0.7);
    }

    const cx = Math.sin(yaw) * Math.cos(pitch) * radius;
    const cy = 1.15 + Math.sin(pitch) * radius * 0.85;
    const cz = Math.cos(yaw) * Math.cos(pitch) * radius;
    camera.position.set(cx, cy, cz);
    camera.lookAt(BULL.x, lookY, 0);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    targetGroup.rotation.y = yaw * -0.08;
    targetGroup.position.x = yaw * -0.12;

    if (axePhase) placeAxe(axeK, axePhase);

    if (axe.visible) {
      axeLight.position.copy(axe.position).add(new THREE.Vector3(0.4, 0.5, 0.7));
      axeLight.intensity = 28;
      axeRim.position.copy(axe.position).add(new THREE.Vector3(-0.5, 0.2, 0.4));
      axeRim.intensity = 10;
    } else {
      axeLight.intensity = 2;
      axeRim.intensity = 0;
    }
  }

  /**
   * Clock hour → unit vector on the target face (12 = +Y, 3 = +X).
   * 1.5 → 45° clockwise from 12 → upper-right.
   * Mirror of 1.5 across 12–6 → 10.5 → upper-left.
   */
  function clockDir(hour) {
    const rad = (hour / 12) * Math.PI * 2;
    return new THREE.Vector3(Math.sin(rad), Math.cos(rad), 0);
  }

  /**
   * Stuck pose: blade (+X) bites into wall (−Z).
   * Handle sticks OUT toward clock 1:30 (upper-right + toward camera).
   * Wood never crosses the board face.
   */
  function applyStuckPose(bite = 0.08) {
    // Handle out toward 1:30 on the face, strongly toward the thrower (+Z)
    const face = clockDir(1.5); // (≈0.707, ≈0.707, 0)
    const handleOut = new THREE.Vector3(face.x * 0.55, face.y * 0.55, 0.85).normalize();

    // 1) Point local −Y (grip direction from head) along handleOut
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      handleOut
    );

    // 2) Twist around the handle so local +X (blade) faces into the wall
    const bladeProbe = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const intoWall = new THREE.Vector3(0, 0, -1);
    // Project desired intoWall onto plane ⊥ handleOut
    const desired = intoWall.clone().sub(
      handleOut.clone().multiplyScalar(intoWall.dot(handleOut))
    );
    if (desired.lengthSq() > 1e-6) {
      desired.normalize();
      const current = bladeProbe
        .clone()
        .sub(handleOut.clone().multiplyScalar(bladeProbe.dot(handleOut)))
        .normalize();
      const qTwist = new THREE.Quaternion().setFromUnitVectors(current, desired);
      q.premultiply(qTwist);
    }

    axe.quaternion.copy(q);

    // Place so blade tip seats just inside the face
    const tip = BLADE_TIP.clone().applyQuaternion(axe.quaternion);
    const tipWorld = new THREE.Vector3(BULL.x, BULL.y, WALL_Z - bite);
    axe.position.copy(tipWorld).sub(tip);
    axe.scale.setScalar(stuckScale);

    // HARD RULE: eye (wood/steel junction) must stay in front of the board
    keepWoodOutside();
  }

  function keepWoodOutside(minTipClearance = null) {
    axe.updateMatrixWorld(true);
    const eyeW = EYE.clone().applyMatrix4(axe.matrixWorld);
    const gripW = GRIP.clone().applyMatrix4(axe.matrixWorld);
    const tipW = BLADE_TIP.clone().applyMatrix4(axe.matrixWorld);
    const minEyeZ = WALL_Z + 0.28;
    const minGripZ = WALL_Z + 0.55;
    let push = 0;
    if (eyeW.z < minEyeZ) push = Math.max(push, minEyeZ - eyeW.z);
    if (gripW.z < minGripZ) push = Math.max(push, minGripZ - gripW.z);
    if (minTipClearance != null && tipW.z < WALL_Z + minTipClearance) {
      push = Math.max(push, WALL_Z + minTipClearance - tipW.z);
    }
    if (push > 0) axe.position.z += push;
  }

  function placeAxe(k, phase) {
    if (phase === "approach" || phase === "impact") {
      // World-space arc that stays IN FRONT of the wall until the bite
      const start = new THREE.Vector3(BULL.x - 0.2, BULL.y + 0.35, 2.2);
      const mid = new THREE.Vector3(BULL.x + 0.15, BULL.y + 0.55, 1.1);
      applyStuckPose(0.08);
      const endPos = axe.position.clone();
      const endQ = axe.quaternion.clone();

      if (phase === "approach") {
        const ease = easeInOut(k);
        // Position along bezier in front of wall
        const u = ease * 0.92; // never reach full embed during approach
        const pos = new THREE.Vector3().copy(start).lerp(mid, u);
        // Keep Z strictly in front
        pos.z = Math.max(pos.z, WALL_Z + 0.85);
        axe.position.copy(pos);

        const airQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0.3, 0.8 + k * Math.PI * 1.6, -0.4, "XYZ")
        );
        axe.quaternion.slerpQuaternions(airQ, endQ, ease);
        axe.scale.setScalar(THREE.MathUtils.lerp(1.15, stuckScale, ease));
        keepWoodOutside();
      } else {
        // Impact: settle into stuck pose
        const ease = easeOut(k);
        axe.position.lerpVectors(
          new THREE.Vector3(BULL.x + 0.1, BULL.y + 0.2, WALL_Z + 0.9),
          endPos,
          ease
        );
        const airQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0.2, 0.3, -0.2, "XYZ")
        );
        axe.quaternion.slerpQuaternions(airQ, endQ, ease);
        if (ease > 0.55) applyStuckPose(0.06 + (ease - 0.55) * 0.06);
        else keepWoodOutside();
        axe.scale.setScalar(stuckScale);
      }
      axe.visible = true;
      return;
    }

    // Camera-space windup / release / flight — always clamp in front of wall
    let lx, ly, lz, spin, tumbleY, tumbleX, s;
    if (phase === "windup") {
      lx = THREE.MathUtils.lerp(-0.9, -1.15, k);
      ly = THREE.MathUtils.lerp(-0.05, -0.25, k);
      lz = THREE.MathUtils.lerp(-2.2, -2.45, k);
      spin = THREE.MathUtils.lerp(-0.3, -0.9, k);
      tumbleY = THREE.MathUtils.lerp(0.4, 0.9, k);
      tumbleX = THREE.MathUtils.lerp(0.1, 0.35, k);
      s = THREE.MathUtils.lerp(1.25, 1.4, k);
    } else if (phase === "release") {
      const u = k;
      lx = THREE.MathUtils.lerp(-1.1, 0.1, u);
      ly = THREE.MathUtils.lerp(-0.2, 0.35, Math.sin(u * Math.PI));
      lz = THREE.MathUtils.lerp(-2.4, -2.9, u);
      spin = THREE.MathUtils.lerp(-0.9, Math.PI * 2.0, u);
      tumbleY = THREE.MathUtils.lerp(0.9, -0.8, u);
      tumbleX = THREE.MathUtils.lerp(0.35, 0.7, u);
      s = THREE.MathUtils.lerp(1.4, 1.25, u);
    } else {
      const u = k;
      lx = THREE.MathUtils.lerp(0.1, 0.02, u);
      ly = THREE.MathUtils.lerp(0.3, 0.1, u);
      lz = THREE.MathUtils.lerp(-2.9, -3.3, u);
      spin = Math.PI * 2.0 + u * Math.PI * 2.2;
      tumbleY = THREE.MathUtils.lerp(-0.8, 0.5, u);
      tumbleX = THREE.MathUtils.lerp(0.7, 0.35, u);
      s = THREE.MathUtils.lerp(1.25, 1.1, u);
    }

    const local = new THREE.Vector3(lx, ly, lz);
    local.applyMatrix4(camera.matrixWorld);
    // Keep center of mass well in front of the board during flight
    local.z = Math.max(local.z, WALL_Z + 1.15);
    axe.position.copy(local);
    axe.scale.setScalar(s);

    // Orient: BLADE (+X) leads toward the bullseye — never handle-first
    const toTarget = BULL.clone().sub(axe.position).normalize();
    const qLead = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      toTarget
    );
    // Spin around the flight axis (blade direction)
    const qSpin = new THREE.Quaternion().setFromAxisAngle(toTarget, spin);
    axe.quaternion.copy(qSpin).multiply(qLead);
    // Slight tumble for drama
    axe.rotateY(tumbleY * 0.35);
    axe.rotateZ(tumbleX * 0.25);

    // During flight keep the whole axe clearly in front of the board
    keepWoodOutside(0.55);
  }

  let heroOpacity = 1;
  let throwOpacity = 0;
  const heroEl = () => document.getElementById("hero-copy");
  const throwEl = () => document.getElementById("throw-copy");
  function heroFade(v) {
    heroOpacity = v;
    const el = heroEl();
    if (el) {
      el.style.opacity = String(v);
      el.style.pointerEvents = v < 0.1 ? "none" : "auto";
    }
  }
  function throwFade(v) {
    throwOpacity = v;
    const el = throwEl();
    if (el) el.style.opacity = String(v);
  }

  function easeInOut(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }
  function easeOut(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  let raf = 0;
  function render() {
    raf = requestAnimationFrame(render);
    if (state.progress < 0.05) {
      const t = performance.now() * 0.00025;
      camera.position.x += Math.sin(t) * 0.002;
      camera.position.y += Math.cos(t * 0.8) * 0.001;
    }
    renderer.render(scene, camera);
  }
  render();

  setProgress(0);
  heroFade(1);
  throwFade(0);

  return {
    setProgress,
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
    get progress() {
      return state.progress;
    },
    debug() {
      axe.updateMatrixWorld(true);
      const tip = BLADE_TIP.clone().applyMatrix4(axe.matrixWorld);
      const eye = EYE.clone().applyMatrix4(axe.matrixWorld);
      const grip = GRIP.clone().applyMatrix4(axe.matrixWorld);
      return {
        progress: state.progress,
        visible: axe.visible,
        tip: tip.toArray().map((n) => +n.toFixed(3)),
        eye: eye.toArray().map((n) => +n.toFixed(3)),
        grip: grip.toArray().map((n) => +n.toFixed(3)),
        wallZ: WALL_Z,
        handleClear: eye.z > WALL_Z + 0.2 && grip.z > WALL_Z + 0.4,
        tipInWood: tip.z < WALL_Z + 0.05,
        // clock angle of grip relative to bull (12=+Y)
        gripClock: +(
          ((Math.atan2(grip.x - BULL.x, grip.y - BULL.y) * 12) / (Math.PI * 2) + 12) %
          12
        ).toFixed(2),
      };
    },
  };
}

/** Wood planks + rings + green killshots at clock 1:30 and 10:30 */
function buildVirtualTarget(group, bull) {
  const woodTex = makeWoodTexture();
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;

  const plankMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.88,
    metalness: 0.03,
  });

  const plankW = 0.52;
  const plankH = 6.2;
  const plankD = 0.28;
  const count = 10;
  const totalW = plankW * count;
  for (let i = 0; i < count; i++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(plankW - 0.02, plankH, plankD),
      plankMat.clone()
    );
    const shade = 0.92 + (i % 3) * 0.04;
    plank.material.color.setRGB(shade, shade * 0.88, shade * 0.72);
    plank.position.set(-totalW / 2 + plankW * 0.5 + i * plankW, 1.4, -0.14);
    plank.castShadow = true;
    plank.receiveShadow = true;
    plank.position.z += ((i * 17) % 5) * 0.004;
    group.add(plank);
  }

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a1c,
    roughness: 0.8,
    metalness: 0.05,
  });
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.15, 0.18, 0.4), railMat);
  topRail.position.set(0, 1.4 + plankH / 2 + 0.05, -0.1);
  group.add(topRail);
  const botRail = topRail.clone();
  botRail.position.y = 1.4 - plankH / 2 - 0.05;
  group.add(botRail);

  const ringZ = 0.02;
  const cx = bull.x;
  const cy = bull.y;

  function paintRing(rOuter, rInner, color) {
    const geo = new THREE.RingGeometry(rInner, rOuter, 72);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cx, cy, ringZ);
    group.add(m);
  }

  paintRing(1.42, 1.28, 0x2a5f9e);
  paintRing(0.92, 0.78, 0xc41e12);
  const bullMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 48),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55 })
  );
  bullMesh.position.set(cx, cy, ringZ + 0.005);
  group.add(bullMesh);

  // Green killshots at clock 1:30 and mirror 10:30
  function greenAt(hour, radius = 1.05) {
    const rad = (hour / 12) * Math.PI * 2;
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 32),
      new THREE.MeshStandardMaterial({ color: 0x1f9d55, roughness: 0.55 })
    );
    g.position.set(cx + Math.sin(rad) * radius, cy + Math.cos(rad) * radius, ringZ + 0.008);
    group.add(g);
  }
  greenAt(1.5);
  greenAt(10.5); // قرینهٔ ۱:۳۰ نسبت به محور ۱۲–۶
}

function makeWoodTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c4a882";
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    ctx.strokeStyle = `rgba(90,60,35,${0.08 + Math.random() * 0.15})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 8, 160, x - 10, 320, x + 4, 512);
    ctx.stroke();
  }
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(60,40,20,${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 512, 2, 8 + Math.random() * 20);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function buildChips() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.9 });
  for (let i = 0; i < 10; i++) {
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 + Math.random() * 0.05, 0.01, 0.03 + Math.random() * 0.04),
      mat
    );
    const a = (i / 10) * Math.PI * 2;
    chip.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.18, 0.08 + Math.random() * 0.08);
    chip.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(chip);
  }
  return g;
}

/**
 * Real throwing hatchet:
 *  - Handle along Y (grip −Y, head +Y)
 *  - Blade extends in +X  ← perpendicular to handle (NOT a shovel)
 *  - Poll on −X
 *  - Thin in Z
 */
function buildHatchet() {
  const g = new THREE.Group();

  const wood = new THREE.MeshStandardMaterial({
    color: 0xc48a4a,
    roughness: 0.62,
    metalness: 0.05,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0xdde3ec,
    roughness: 0.22,
    metalness: 0.98,
    emissive: 0x334455,
    emissiveIntensity: 0.22,
  });
  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x6a7382,
    roughness: 0.35,
    metalness: 0.92,
  });
  const wrapMat = new THREE.MeshStandardMaterial({
    color: 0x8b1a12,
    roughness: 0.5,
    metalness: 0.12,
  });

  // —— Handle (wood) ——
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.062, 1.55, 20),
    wood
  );
  handle.position.y = -0.45;
  handle.castShadow = true;
  g.add(handle);

  // Slight flare toward head
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.048, 0.22, 16),
    wood
  );
  neck.position.y = 0.28;
  g.add(neck);

  const wrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.072, 0.22, 16),
    wrapMat
  );
  wrap.position.y = -1.0;
  wrap.castShadow = true;
  g.add(wrap);

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.078, 0.28, 16),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.75 })
  );
  grip.position.y = -1.28;
  grip.castShadow = true;
  g.add(grip);

  // —— Head eye (steel around handle top) — compact, not a shovel scoop ——
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.15), steelDark);
  eye.position.set(0.0, 0.48, 0);
  eye.castShadow = true;
  g.add(eye);

  // —— Bearded throwing-axe blade in +X (classic hatchet, NOT a shovel) ——
  // Wide curved bit, deep beard, thin profile
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0.02, 0.16); // top of cheek
  bladeShape.lineTo(0.38, 0.22); // toe
  bladeShape.quadraticCurveTo(0.7, 0.12, 0.78, -0.02); // curved cutting edge
  bladeShape.quadraticCurveTo(0.7, -0.18, 0.42, -0.32); // beard curve
  bladeShape.lineTo(0.12, -0.2); // heel back to eye
  bladeShape.lineTo(0.02, -0.1);
  bladeShape.closePath();

  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.038,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    }),
    steel
  );
  blade.position.set(0.1, 0.48, -0.019);
  blade.castShadow = true;
  g.add(blade);

  // Sharper edge highlight (thin bright lip on +X)
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.35, 0.01),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.12,
      emissive: 0x888899,
      emissiveIntensity: 0.25,
    })
  );
  edge.position.set(0.86, 0.48, 0);
  edge.rotation.z = -0.15;
  g.add(edge);

  // —— Poll (hammer back, −X) ——
  const poll = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.16), steelDark);
  poll.position.set(-0.14, 0.5, 0);
  poll.castShadow = true;
  g.add(poll);

  return g;
}
