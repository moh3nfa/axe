/**
 * Iran Axe Throwing — fully procedural Three.js scroll engine
 * Real hatchet proportions (blade ⊥ handle). No photos.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

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
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Studio env so brushed steel actually reflects light
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 1.2, 6.5);

  scene.add(new THREE.AmbientLight(0xfff0e0, 0.55));

  const key = new THREE.DirectionalLight(0xffe2c8, 2.6);
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

  const rim = new THREE.DirectionalLight(0xa8c4ff, 0.85);
  rim.position.set(-6, 3, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xfff5e8, 0.7);
  fill.position.set(-2, 4, 6);
  scene.add(fill);

  const warm = new THREE.PointLight(0xff5533, 16, 22, 2);
  warm.position.set(0, 2.5, 2.2);
  scene.add(warm);

  const groundMaps = makeDarkWoodMaps(512, 512);
  groundMaps.map.colorSpace = THREE.SRGBColorSpace;
  groundMaps.map.wrapS = groundMaps.map.wrapT = THREE.RepeatWrapping;
  groundMaps.map.repeat.set(4, 4);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({
      map: groundMaps.map,
      roughnessMap: groundMaps.roughnessMap,
      bumpMap: groundMaps.bumpMap,
      bumpScale: 0.04,
      color: 0x5a4a3a,
      roughness: 0.95,
      metalness: 0.02,
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

  const axeLight = new THREE.PointLight(0xfff0dd, 42, 12, 1.5);
  scene.add(axeLight);
  const axeRim = new THREE.PointLight(0xb0c8ff, 18, 8, 1.8);
  scene.add(axeRim);
  const axeSpec = new THREE.PointLight(0xffffff, 14, 5, 2);
  scene.add(axeSpec);

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
  const BLADE_TIP = new THREE.Vector3(0.68, 0.48, 0);
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

    targetGroup.rotation.y = 0;
    targetGroup.position.x = 0;

    if (axePhase) placeAxe(axeK, axePhase);

    if (axe.visible) {
      axeLight.position.copy(axe.position).add(new THREE.Vector3(0.55, 0.65, 0.9));
      axeLight.intensity = 42;
      axeRim.position.copy(axe.position).add(new THREE.Vector3(-0.6, 0.25, 0.5));
      axeRim.intensity = 18;
      axeSpec.position.copy(axe.position).add(new THREE.Vector3(0.9, 0.35, 0.4));
      axeSpec.intensity = 16;
    } else {
      axeLight.intensity = 2;
      axeRim.intensity = 0;
      axeSpec.intensity = 0;
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
    const minEyeZ = WALL_Z + 0.42;
    const minGripZ = WALL_Z + 0.75;
    let push = 0;
    if (eyeW.z < minEyeZ) push = Math.max(push, minEyeZ - eyeW.z);
    if (gripW.z < minGripZ) push = Math.max(push, minGripZ - gripW.z);
    if (minTipClearance != null && tipW.z < WALL_Z + minTipClearance) {
      push = Math.max(push, WALL_Z + minTipClearance - tipW.z);
    }
    if (push > 0) axe.position.z += push;
  }

  /**
   * Flight orientation: blade (+X) ALWAYS aims at the bullseye.
   * Roll only around the flight axis (handle twirls) — never tumble on
   * world X, which pulled the bit away from the target.
   */
  function orientAxeTowardTarget(roll) {
    const toTarget = BULL.clone().sub(axe.position).normalize();
    if (toTarget.lengthSq() < 1e-8) toTarget.set(0, 0, -1);

    const qLead = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      toTarget
    );
    const qRoll = new THREE.Quaternion().setFromAxisAngle(toTarget, roll);
    axe.quaternion.copy(qRoll).multiply(qLead);
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
        const u = ease * 0.92;
        const pos = new THREE.Vector3().copy(start).lerp(mid, u);
        pos.z = Math.max(pos.z, WALL_Z + 0.85);
        axe.position.copy(pos);

        // Blade still locked on the bull; ease into stuck twist
        orientAxeTowardTarget(0.15);
        const airQ = axe.quaternion.clone();
        axe.quaternion.slerpQuaternions(airQ, endQ, ease);
        axe.scale.setScalar(THREE.MathUtils.lerp(1.15, stuckScale, ease));
        keepWoodOutside();
      } else {
        const ease = easeOut(k);
        axe.position.lerpVectors(
          new THREE.Vector3(BULL.x + 0.1, BULL.y + 0.2, WALL_Z + 0.9),
          endPos,
          ease
        );
        if (ease < 0.35) {
          orientAxeTowardTarget(0.05);
          const airQ = axe.quaternion.clone();
          axe.quaternion.slerpQuaternions(airQ, endQ, ease / 0.35);
          keepWoodOutside();
        } else {
          applyStuckPose(0.06 + (ease - 0.35) * 0.05);
        }
        axe.scale.setScalar(stuckScale);
      }
      axe.visible = true;
      return;
    }

    // Camera-space windup / release / flight — always clamp in front of wall
    let lx, ly, lz, roll, s;
    if (phase === "windup") {
      lx = THREE.MathUtils.lerp(-0.9, -1.15, k);
      ly = THREE.MathUtils.lerp(-0.05, -0.25, k);
      lz = THREE.MathUtils.lerp(-2.2, -2.45, k);
      roll = THREE.MathUtils.lerp(0.2, 0.55, k);
      s = THREE.MathUtils.lerp(1.25, 1.4, k);
    } else if (phase === "release") {
      const u = k;
      lx = THREE.MathUtils.lerp(-1.1, 0.1, u);
      ly = THREE.MathUtils.lerp(-0.2, 0.35, Math.sin(u * Math.PI));
      lz = THREE.MathUtils.lerp(-2.4, -2.9, u);
      // Handle rolls around the throw line; blade stays on the bull
      roll = THREE.MathUtils.lerp(0.55, Math.PI * 2.1, u);
      s = THREE.MathUtils.lerp(1.4, 1.25, u);
    } else {
      const u = k;
      lx = THREE.MathUtils.lerp(0.1, 0.02, u);
      ly = THREE.MathUtils.lerp(0.3, 0.1, u);
      lz = THREE.MathUtils.lerp(-2.9, -3.3, u);
      roll = Math.PI * 2.1 + u * Math.PI * 2.0;
      s = THREE.MathUtils.lerp(1.25, 1.1, u);
    }

    const local = new THREE.Vector3(lx, ly, lz);
    local.applyMatrix4(camera.matrixWorld);
    local.z = Math.max(local.z, WALL_Z + 1.15);
    axe.position.copy(local);
    axe.scale.setScalar(s);

    orientAxeTowardTarget(roll);
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

/** Wood planks + rings + green killshots OUTSIDE the blue ring at 1:30 / 10:30 */
function buildVirtualTarget(group, bull) {
  const wood = makeWoodMaps(512, 1024);
  wood.map.colorSpace = THREE.SRGBColorSpace;
  wood.map.wrapS = wood.map.wrapT = THREE.RepeatWrapping;
  wood.map.repeat.set(1, 2);
  wood.roughnessMap.wrapS = wood.roughnessMap.wrapT = THREE.RepeatWrapping;
  wood.bumpMap.wrapS = wood.bumpMap.wrapT = THREE.RepeatWrapping;

  const plankMat = new THREE.MeshStandardMaterial({
    map: wood.map,
    roughnessMap: wood.roughnessMap,
    bumpMap: wood.bumpMap,
    bumpScale: 0.035,
    roughness: 0.92,
    metalness: 0.02,
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
    // Per-plank tone: warmer / cooler / darker
    const tones = [
      [1.0, 0.92, 0.78],
      [0.95, 0.86, 0.7],
      [0.88, 0.78, 0.62],
      [1.02, 0.9, 0.72],
    ];
    const t = tones[i % tones.length];
    plank.material.color.setRGB(t[0], t[1], t[2]);
    plank.material.map = wood.map.clone();
    plank.material.map.needsUpdate = true;
    plank.material.map.offset.set((i * 0.17) % 1, (i * 0.09) % 1);
    plank.position.set(-totalW / 2 + plankW * 0.5 + i * plankW, 1.4, -0.14);
    plank.castShadow = true;
    plank.receiveShadow = true;
    plank.position.z += ((i * 17) % 5) * 0.004;
    group.add(plank);
  }

  const railTex = makeDarkWoodMaps(256, 256);
  railTex.map.colorSpace = THREE.SRGBColorSpace;
  const railMat = new THREE.MeshStandardMaterial({
    map: railTex.map,
    roughnessMap: railTex.roughnessMap,
    bumpMap: railTex.bumpMap,
    bumpScale: 0.02,
    roughness: 0.85,
    metalness: 0.04,
    color: 0xffffff,
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

  function paintRing(rOuter, rInner, hex) {
    const paint = makePaintMaps(hex);
    paint.map.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.RingGeometry(rInner, rOuter, 96);
    const mat = new THREE.MeshStandardMaterial({
      map: paint.map,
      roughnessMap: paint.roughnessMap,
      roughness: 0.72,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cx, cy, ringZ);
    group.add(m);
  }

  paintRing(1.42, 1.28, "#2a5f9e");
  paintRing(0.92, 0.78, "#c41e12");

  const bullPaint = makePaintMaps("#1a1410");
  bullPaint.map.colorSpace = THREE.SRGBColorSpace;
  const bullMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 64),
    new THREE.MeshStandardMaterial({
      map: bullPaint.map,
      roughnessMap: bullPaint.roughnessMap,
      roughness: 0.7,
      metalness: 0.08,
    })
  );
  bullMesh.position.set(cx, cy, ringZ + 0.005);
  group.add(bullMesh);

  // Green killshots OUTSIDE the blue ring (blue outer = 1.42)
  function greenAt(hour, radius = 1.68) {
    const rad = (hour / 12) * Math.PI * 2;
    const gPaint = makePaintMaps("#1f9d55");
    gPaint.map.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 32),
      new THREE.MeshStandardMaterial({
        map: gPaint.map,
        roughness: 0.6,
        metalness: 0.05,
      })
    );
    g.position.set(cx + Math.sin(rad) * radius, cy + Math.cos(rad) * radius, ringZ + 0.008);
    group.add(g);
  }
  greenAt(1.5);
  greenAt(10.5);
}

/** Layered oak-like wood: grain, pores, knots, stain */
function makeWoodMaps(w = 512, h = 1024) {
  const color = document.createElement("canvas");
  color.width = w;
  color.height = h;
  const ctx = color.getContext("2d");

  // Base stain gradient
  const base = ctx.createLinearGradient(0, 0, w, 0);
  base.addColorStop(0, "#b8956a");
  base.addColorStop(0.35, "#d4b089");
  base.addColorStop(0.55, "#c4a074");
  base.addColorStop(0.8, "#a87d52");
  base.addColorStop(1, "#c9a57a");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Soft vertical bands (growth rings / plank strips)
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * w + Math.random() * 8;
    const g = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
    g.addColorStop(0, "rgba(90,55,28,0)");
    g.addColorStop(0.5, `rgba(70,40,18,${0.06 + Math.random() * 0.1})`);
    g.addColorStop(1, "rgba(90,55,28,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 14, 0, 28, h);
  }

  // Flowing grain lines
  for (let i = 0; i < 90; i++) {
    const x0 = Math.random() * w;
    ctx.strokeStyle = `rgba(${50 + Math.random() * 40},${28 + Math.random() * 20},${10}, ${0.08 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    let x = x0;
    for (let y = 0; y < h; y += 24) {
      x += Math.sin(y * 0.01 + i) * 6 + (Math.random() - 0.5) * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Pores / flecks
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(40,22,10,${Math.random() * 0.18})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 6);
  }

  // A few knots
  for (let k = 0; k < 5; k++) {
    const kx = 40 + Math.random() * (w - 80);
    const ky = 60 + Math.random() * (h - 120);
    const kr = 10 + Math.random() * 18;
    for (let r = kr; r > 2; r -= 2) {
      ctx.strokeStyle = `rgba(55,30,12,${0.15 + (kr - r) / kr * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, r, r * 0.7, Math.random() * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(40,22,10,0.35)";
    ctx.beginPath();
    ctx.ellipse(kx, ky, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Impact scars / axe marks
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.strokeStyle = `rgba(30,15,8,${0.12 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 30, y + 8 + Math.random() * 20);
    ctx.stroke();
  }

  // Roughness + bump from luminance-ish noise
  const rough = document.createElement("canvas");
  rough.width = w;
  rough.height = h;
  const rctx = rough.getContext("2d");
  rctx.fillStyle = "#9a9a9a";
  rctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2000; i++) {
    const v = 80 + Math.random() * 120;
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 2 + Math.random() * 10);
  }
  // Grain as darker roughness streaks
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * w;
    rctx.strokeStyle = `rgba(40,40,40,${0.2 + Math.random() * 0.3})`;
    rctx.lineWidth = 1 + Math.random() * 2;
    rctx.beginPath();
    rctx.moveTo(x, 0);
    rctx.bezierCurveTo(x + 10, h * 0.3, x - 8, h * 0.7, x + 4, h);
    rctx.stroke();
  }

  const bump = document.createElement("canvas");
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext("2d");
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * w;
    bctx.strokeStyle = `rgba(${100 + Math.random() * 80},${100 + Math.random() * 80},${100 + Math.random() * 80},0.5)`;
    bctx.lineWidth = 1 + Math.random() * 3;
    bctx.beginPath();
    bctx.moveTo(x, 0);
    bctx.bezierCurveTo(x + 8, h * 0.33, x - 10, h * 0.66, x + 2, h);
    bctx.stroke();
  }

  const map = new THREE.CanvasTexture(color);
  const roughnessMap = new THREE.CanvasTexture(rough);
  const bumpMap = new THREE.CanvasTexture(bump);
  map.anisotropy = 8;
  roughnessMap.anisotropy = 4;
  bumpMap.anisotropy = 4;
  return { map, roughnessMap, bumpMap };
}

function makeDarkWoodMaps(w = 256, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#3a2a1c";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(20,12,6,${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const x = Math.random() * w;
    ctx.beginPath();
    ctx.moveTo(0, x);
    ctx.bezierCurveTo(w * 0.3, x + 4, w * 0.7, x - 4, w, x + 2);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  const roughnessMap = new THREE.CanvasTexture(c);
  const bumpMap = map;
  return { map, roughnessMap, bumpMap };
}

/** Chalky painted ring / killshot with brush noise */
function makePaintMaps(hex) {
  const w = 256;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, w, h);
  // Brush streaks
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.08})`;
    ctx.lineWidth = 2 + Math.random() * 6;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(w * 0.5, y + (Math.random() - 0.5) * 20, w, y + (Math.random() - 0.5) * 10);
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }
  // Specks / wear
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }

  const r = document.createElement("canvas");
  r.width = w;
  r.height = h;
  const rctx = r.getContext("2d");
  rctx.fillStyle = "#b0b0b0";
  rctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) {
    const v = 60 + Math.random() * 140;
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  return {
    map: new THREE.CanvasTexture(c),
    roughnessMap: new THREE.CanvasTexture(r),
  };
}

/** Brushed / forged steel — deeper wear, heat tint, edge polish */
function makeSteelMaps() {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  // Cool bright steel base
  const g = ctx.createRadialGradient(w * 0.35, h * 0.4, 20, w * 0.5, h * 0.5, w * 0.7);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.3, "#e8eef5");
  g.addColorStop(0.55, "#c5d0dc");
  g.addColorStop(0.8, "#a8b4c4");
  g.addColorStop(1, "#8a96a8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Fine horizontal brush (mill finish)
  for (let i = 0; i < 280; i++) {
    const y = Math.random() * h;
    const bright = Math.random() > 0.45;
    ctx.strokeStyle = bright
      ? `rgba(255,255,255,${0.03 + Math.random() * 0.12})`
      : `rgba(25,32,42,${0.04 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.4 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }

  // Diagonal forge streaks
  for (let i = 0; i < 35; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.06})`;
    ctx.lineWidth = 2 + Math.random() * 5;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + 40 + Math.random() * 60);
    ctx.stroke();
  }

  // Heat-blue / oil tint patches
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rg = ctx.createRadialGradient(x, y, 2, x, y, 30 + Math.random() * 50);
    rg.addColorStop(0, `rgba(80,120,180,${0.08 + Math.random() * 0.1})`);
    rg.addColorStop(0.5, `rgba(160,90,50,${0.04 + Math.random() * 0.06})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(x - 80, y - 80, 160, 160);
  }

  // Edge polish strip (brighter band)
  const edge = ctx.createLinearGradient(w * 0.75, 0, w, 0);
  edge.addColorStop(0, "rgba(255,255,255,0)");
  edge.addColorStop(0.6, "rgba(255,255,255,0.12)");
  edge.addColorStop(1, "rgba(255,255,255,0.22)");
  ctx.fillStyle = edge;
  ctx.fillRect(w * 0.7, 0, w * 0.3, h);

  // Deep scratches / pits
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = `rgba(15,20,28,${0.1 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.6 + Math.random();
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8 + Math.random() * 50, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(10,12,16,${0.15 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Roughness: polished edge vs brushed body
  const r = document.createElement("canvas");
  r.width = w;
  r.height = h;
  const rctx = r.getContext("2d");
  rctx.fillStyle = "#7a7a7a";
  rctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * h;
    const v = 30 + Math.random() * 180;
    rctx.strokeStyle = `rgb(${v},${v},${v})`;
    rctx.lineWidth = 1;
    rctx.beginPath();
    rctx.moveTo(0, y);
    rctx.lineTo(w, y);
    rctx.stroke();
  }
  // Smooth (dark in roughness = glossy) along cutting edge
  const rg = rctx.createLinearGradient(w * 0.7, 0, w, 0);
  rg.addColorStop(0, "rgba(180,180,180,0)");
  rg.addColorStop(1, "rgba(35,35,35,0.85)");
  rctx.fillStyle = rg;
  rctx.fillRect(w * 0.65, 0, w * 0.35, h);

  // Metalness map — high everywhere, slightly less on pitted areas
  const m = document.createElement("canvas");
  m.width = w;
  m.height = h;
  const mctx = m.getContext("2d");
  mctx.fillStyle = "#e8e8e8";
  mctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 50; i++) {
    mctx.fillStyle = `rgba(120,120,120,${0.2 + Math.random() * 0.3})`;
    mctx.beginPath();
    mctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 0, Math.PI * 2);
    mctx.fill();
  }

  // Bump from brush + pits
  const b = document.createElement("canvas");
  b.width = w;
  b.height = h;
  const bctx = b.getContext("2d");
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) {
    const y = Math.random() * h;
    const v = 90 + Math.random() * 70;
    bctx.strokeStyle = `rgb(${v},${v},${v})`;
    bctx.lineWidth = 1 + Math.random();
    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.lineTo(w, y);
    bctx.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(r);
  roughnessMap.anisotropy = 4;
  const metalnessMap = new THREE.CanvasTexture(m);
  const bumpMap = new THREE.CanvasTexture(b);
  bumpMap.anisotropy = 4;
  return { map, roughnessMap, metalnessMap, bumpMap };
}

/** Hickory handle wood — tight longitudinal grain, oil sheen, grip wear */
function makeHandleWoodMaps() {
  const w = 256;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  // Warm hickory base — stronger contrast
  const base = ctx.createLinearGradient(0, 0, w, 0);
  base.addColorStop(0, "#6e4324");
  base.addColorStop(0.2, "#b87840");
  base.addColorStop(0.45, "#e8c080");
  base.addColorStop(0.7, "#c48848");
  base.addColorStop(1, "#8a552e");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Longitudinal grain (along handle length = Y on UV)
  for (let i = 0; i < 90; i++) {
    const x = (i / 90) * w + Math.sin(i * 1.7) * 4;
    ctx.strokeStyle = `rgba(${25 + Math.random() * 35},${12 + Math.random() * 18},4,${0.18 + Math.random() * 0.35})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    let xx = x;
    for (let y = 0; y <= h; y += 16) {
      xx += Math.sin(y * 0.01 + i * 0.45) * 2.2;
      ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  // Lighter highlight grains
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * w;
    ctx.strokeStyle = `rgba(255,220,160,${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, 0);
    let xx = x;
    for (let y = 0; y <= h; y += 24) {
      xx += Math.sin(y * 0.007 + i) * 1.5;
      ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }

  // Growth-ring curves near ends
  for (let i = 0; i < 12; i++) {
    const y = 30 + i * 18;
    ctx.strokeStyle = `rgba(60,30,12,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(w / 2, y, 20 + i * 2, 6 + i * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const y = h - 30 - i * 18;
    ctx.strokeStyle = `rgba(60,30,12,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(w / 2, y, 20 + i * 2, 6 + i * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Oil darkening / hand polish mid-handle
  const oil = ctx.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w * 0.7);
  oil.addColorStop(0, "rgba(90,50,20,0.18)");
  oil.addColorStop(1, "rgba(90,50,20,0)");
  ctx.fillStyle = oil;
  ctx.fillRect(0, 0, w, h);

  // Grip wear near bottom
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(255,220,170,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * w, h * 0.7 + Math.random() * h * 0.28, 1, 1 + Math.random() * 3);
  }

  // Pores
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(35,18,8,${Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1 + Math.random() * 4);
  }

  // Small check / split lines
  for (let i = 0; i < 6; i++) {
    const x = 20 + Math.random() * (w - 40);
    ctx.strokeStyle = `rgba(30,15,8,${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, Math.random() * h * 0.3);
    ctx.lineTo(x + (Math.random() - 0.5) * 8, h * 0.4 + Math.random() * h * 0.4);
    ctx.stroke();
  }

  const rough = document.createElement("canvas");
  rough.width = w;
  rough.height = h;
  const rctx = rough.getContext("2d");
  rctx.fillStyle = "#8a8a8a";
  rctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * w;
    rctx.strokeStyle = `rgba(${40 + Math.random() * 100},${40 + Math.random() * 100},${40 + Math.random() * 100},0.5)`;
    rctx.lineWidth = 1 + Math.random() * 2;
    rctx.beginPath();
    rctx.moveTo(x, 0);
    rctx.lineTo(x + Math.sin(i) * 4, h);
    rctx.stroke();
  }
  // Smoother (oiled) mid section
  const sg = rctx.createLinearGradient(0, h * 0.35, 0, h * 0.75);
  sg.addColorStop(0, "rgba(200,200,200,0)");
  sg.addColorStop(0.5, "rgba(40,40,40,0.55)");
  sg.addColorStop(1, "rgba(200,200,200,0)");
  rctx.fillStyle = sg;
  rctx.fillRect(0, 0, w, h);

  const bump = document.createElement("canvas");
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext("2d");
  bctx.fillStyle = "#787878";
  bctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * w;
    const v = 100 + Math.random() * 80;
    bctx.strokeStyle = `rgb(${v},${v},${v})`;
    bctx.lineWidth = 1 + Math.random() * 2.5;
    bctx.beginPath();
    bctx.moveTo(x, 0);
    bctx.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.7, x + 1, h);
    bctx.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const roughnessMap = new THREE.CanvasTexture(rough);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 4;
  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 4;
  return { map, roughnessMap, bumpMap };
}

/** Red leather wrap — grain + stitch marks */
function makeLeatherMaps() {
  const w = 256;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#5c100c");
  g.addColorStop(0.4, "#8a1c14");
  g.addColorStop(0.7, "#6e1510");
  g.addColorStop(1, "#4a0c08");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(${20 + Math.random() * 40},${5 + Math.random() * 10},5,${0.08 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + Math.random() * 3, 0.6 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 18; i++) {
    const y = 12 + i * 14;
    ctx.strokeStyle = `rgba(255,180,140,${0.06 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 6 + Math.random() * 4]);
    ctx.beginPath();
    ctx.moveTo(8, y);
    ctx.lineTo(w - 8, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const bump = document.createElement("canvas");
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext("2d");
  bctx.fillStyle = "#787878";
  bctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) {
    const v = 70 + Math.random() * 90;
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.beginPath();
    bctx.ellipse(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 0.8, 0, 0, Math.PI * 2);
    bctx.fill();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}

function buildChips() {
  const g = new THREE.Group();
  const wood = makeWoodMaps(128, 128);
  wood.map.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: wood.map,
    roughness: 0.88,
    metalness: 0.02,
  });
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

  const handleWood = makeHandleWoodMaps();
  const wood = new THREE.MeshStandardMaterial({
    map: handleWood.map,
    roughnessMap: handleWood.roughnessMap,
    bumpMap: handleWood.bumpMap,
    bumpScale: 0.07,
    roughness: 0.62,
    metalness: 0.04,
    color: 0xffffff,
    envMapIntensity: 0.35,
  });

  const steelMaps = makeSteelMaps();
  const steel = new THREE.MeshStandardMaterial({
    map: steelMaps.map,
    roughnessMap: steelMaps.roughnessMap,
    metalnessMap: steelMaps.metalnessMap,
    bumpMap: steelMaps.bumpMap,
    bumpScale: 0.022,
    roughness: 0.22,
    metalness: 1.0,
    envMapIntensity: 1.85,
    color: 0xffffff,
    emissive: 0x101820,
    emissiveIntensity: 0.04,
  });
  const steelDark = new THREE.MeshStandardMaterial({
    map: steelMaps.map,
    roughnessMap: steelMaps.roughnessMap,
    metalnessMap: steelMaps.metalnessMap,
    bumpMap: steelMaps.bumpMap,
    bumpScale: 0.018,
    color: 0xc8d2e0,
    roughness: 0.34,
    metalness: 0.98,
    envMapIntensity: 1.5,
  });
  const leather = makeLeatherMaps();
  const wrapMat = new THREE.MeshStandardMaterial({
    map: leather.map,
    bumpMap: leather.bumpMap,
    bumpScale: 0.04,
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.06,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    map: handleWood.map,
    roughnessMap: handleWood.roughnessMap,
    bumpMap: handleWood.bumpMap,
    bumpScale: 0.05,
    color: 0x6b4228,
    roughness: 0.82,
    metalness: 0.03,
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
    gripMat
  );
  grip.position.y = -1.28;
  grip.castShadow = true;
  g.add(grip);

  // —— Head eye (steel around handle top) — compact, not a shovel scoop ——
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.15), steelDark);
  eye.position.set(0.0, 0.48, 0);
  eye.castShadow = true;
  g.add(eye);

  // —— Classic hatchet blade (+X): short, wide bit + beard ——
  // Looks like an axe from the side, not a shovel/spade
  const bladeShape = new THREE.Shape();
  // Start at eye / cheek
  bladeShape.moveTo(0.0, 0.14);
  bladeShape.lineTo(0.22, 0.2); // top of bit
  bladeShape.lineTo(0.48, 0.16); // toe
  // Curved cutting edge (the bit)
  bladeShape.quadraticCurveTo(0.62, 0.02, 0.55, -0.14);
  // Beard hooks down then back
  bladeShape.quadraticCurveTo(0.4, -0.28, 0.18, -0.22);
  bladeShape.lineTo(0.0, -0.1);
  bladeShape.closePath();

  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.008,
      bevelSegments: 3,
    }),
    steel
  );
  blade.position.set(0.08, 0.48, -0.028);
  blade.castShadow = true;
  g.add(blade);

  // Secondary cheek so head reads as axe mass, not a flat scoop
  const cheekL = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.2, 0.02),
    steelDark
  );
  cheekL.position.set(0.2, 0.5, 0.04);
  g.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.z = -0.04;
  g.add(cheekR);

  // —— Poll (hammer face on −X) ——
  const poll = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.15), steelDark);
  poll.position.set(-0.12, 0.5, 0);
  poll.castShadow = true;
  g.add(poll);

  return g;
}
