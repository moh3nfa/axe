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
  renderer.toneMappingExposure = 1.28;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Studio env so brushed steel actually reflects light
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
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
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), flashMat);
  flash.position.copy(BULL).add(new THREE.Vector3(0, 0, 0.12));
  scene.add(flash);

  const chips = buildChips();
  chips.visible = false;
  chips.position.copy(BULL);
  scene.add(chips);

  const state = { progress: 0 };
  const stuckScale = 1.08;

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
      // Drift toward a 3/4 impact angle while still flying in
      yaw = THREE.MathUtils.lerp(-0.85, 0.42, easeInOut(k));
      pitch = THREE.MathUtils.lerp(-0.06, 0.02, k);
      radius = THREE.MathUtils.lerp(3.6, 2.55, easeInOut(k));
      lookY = THREE.MathUtils.lerp(1.5, 1.52, k);
      fov = THREE.MathUtils.lerp(34, 31, k);
      axe.visible = true;
      axePhase = "approach";
      axeK = k;
      heroFade(0);
      throwFade(1);
      flash.material.opacity = 0;
      chips.visible = false;
    } else {
      const k = (t - 0.9) / 0.1;
      // Tight hero shot — fill the frame with the buried bit
      yaw = THREE.MathUtils.lerp(0.42, 0.95, easeOut(k));
      pitch = THREE.MathUtils.lerp(0.02, 0.08, k);
      radius = THREE.MathUtils.lerp(2.55, 1.45, easeOut(k));
      lookY = 1.48;
      fov = THREE.MathUtils.lerp(31, 24, k);
      axe.visible = true;
      axePhase = "impact";
      axeK = k;
      heroFade(0);
      throwFade(1);
      const hit = Math.min(1, k / 0.18);
      flash.material.opacity = Math.sin(hit * Math.PI) * 0.35 * (1 - k * 0.85);
      // Brief chip burst only at the hit instant — hide after so pose stays clean
      chips.visible = k > 0.03 && k < 0.28;
      const burst = easeOut(Math.min(1, (k - 0.03) / 0.2));
      chips.scale.setScalar(0.2 + burst * 0.55);
      chips.rotation.z = 0;
    }

    const cx = Math.sin(yaw) * Math.cos(pitch) * radius;
    const cy = 1.15 + Math.sin(pitch) * radius * 0.85;
    const cz = Math.cos(yaw) * Math.cos(pitch) * radius;
    camera.position.set(cx, cy, cz);
    // Frame the impact slightly toward the handle so the axe fills the shot
    const lookZ = axePhase === "impact" ? 0.35 : 0;
    const lookX = axePhase === "impact" ? BULL.x + 0.18 : BULL.x;
    camera.lookAt(lookX, lookY, lookZ);
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
   * Stuck pose — blade EDGE buried in bullseye, handle out toward camera
   * (down-right) so a 3/4 view reads depth, not a flat sticker on the board.
   */
  function applyStuckPose(bite = 0.16) {
    // Handle toward camera + right (readable 3/4), blade digs into board
    const handleOut = new THREE.Vector3(0.55, -0.2, 0.82).normalize();
    const bladeInto = new THREE.Vector3(0.02, -0.08, -1).normalize();

    const yAxis = handleOut.clone().negate();
    let xAxis = bladeInto
      .clone()
      .sub(yAxis.clone().multiplyScalar(bladeInto.dot(yAxis)));
    if (xAxis.lengthSq() < 1e-6) xAxis.set(0, 0, -1);
    else xAxis.normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();

    const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    axe.quaternion.setFromRotationMatrix(m);

    const tip = BLADE_TIP.clone().applyQuaternion(axe.quaternion);
    axe.position.set(BULL.x, BULL.y, WALL_Z - bite).sub(tip);
    axe.scale.setScalar(stuckScale);

    // Only nudge along handle if eye clipped — never slide tip off bullseye
    axe.updateMatrixWorld(true);
    const eyeW = EYE.clone().applyMatrix4(axe.matrixWorld);
    if (eyeW.z < WALL_Z + 0.08) {
      const push = Math.min(0.06, WALL_Z + 0.08 - eyeW.z);
      axe.position.addScaledVector(handleOut, push);
    }
  }

  function keepWoodOutside(minTipClearance = null, soft = false) {
    axe.updateMatrixWorld(true);
    const eyeW = EYE.clone().applyMatrix4(axe.matrixWorld);
    const gripW = GRIP.clone().applyMatrix4(axe.matrixWorld);
    const tipW = BLADE_TIP.clone().applyMatrix4(axe.matrixWorld);
    const minEyeZ = soft ? WALL_Z + 0.1 : WALL_Z + 0.42;
    const minGripZ = soft ? WALL_Z + 0.28 : WALL_Z + 0.75;
    let push = 0;
    if (eyeW.z < minEyeZ) push = Math.max(push, minEyeZ - eyeW.z);
    if (gripW.z < minGripZ) push = Math.max(push, minGripZ - gripW.z);
    if (minTipClearance != null && tipW.z < WALL_Z + minTipClearance) {
      push = Math.max(push, WALL_Z + minTipClearance - tipW.z);
    }
    if (soft) push = Math.min(push, 0.08);
    if (push > 0) axe.position.z += push;
  }

  /**
   * End-over-end toward the target around the lateral axis (≈ world X).
   * Negative spin = reversed overhand flip into the board.
   */
  function orientAxeTowardTarget(spin = 0) {
    const toTarget = BULL.clone().sub(axe.position);
    if (toTarget.lengthSq() < 1e-8) toTarget.set(0, 0, -1);
    else toTarget.normalize();

    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(toTarget, worldUp);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    else right.normalize();
    const up = new THREE.Vector3().crossVectors(right, toTarget).normalize();

    const m = new THREE.Matrix4().makeBasis(toTarget, up, right);
    const qFace = new THREE.Quaternion().setFromRotationMatrix(m);
    const qSpin = new THREE.Quaternion().setFromAxisAngle(right, spin);
    axe.quaternion.copy(qSpin).multiply(qFace);
  }

  function placeAxe(k, phase) {
    if (phase === "approach" || phase === "impact") {
      applyStuckPose(0.14);
      const endPos = axe.position.clone();
      const endQ = axe.quaternion.clone();

      if (phase === "approach") {
        const ease = easeInOut(k);
        const start = new THREE.Vector3(BULL.x + 0.05, BULL.y + 0.2, 2.4);
        const mid = new THREE.Vector3(BULL.x, BULL.y + 0.05, 1.15);
        const pos = new THREE.Vector3().copy(start).lerp(mid, ease);
        pos.z = Math.max(pos.z, WALL_Z + 0.7);
        axe.position.copy(pos);

        orientAxeTowardTarget(THREE.MathUtils.lerp(-0.9, -0.08, ease));
        const airQ = axe.quaternion.clone();
        axe.quaternion.slerpQuaternions(airQ, endQ, ease * ease);
        axe.scale.setScalar(THREE.MathUtils.lerp(1.12, stuckScale, ease));
        keepWoodOutside(0.4);
      } else {
        const ease = easeOut(k);
        const pre = new THREE.Vector3(BULL.x + 0.02, BULL.y + 0.04, WALL_Z + 0.55);
        axe.position.lerpVectors(pre, endPos, ease);
        if (ease < 0.35) {
          orientAxeTowardTarget(-0.06);
          const airQ = axe.quaternion.clone();
          axe.quaternion.slerpQuaternions(airQ, endQ, ease / 0.35);
          keepWoodOutside(0.15);
        } else {
          applyStuckPose(0.1 + (ease - 0.35) * 0.08);
        }
        axe.scale.setScalar(stuckScale);
      }
      axe.visible = true;
      return;
    }

    let lx, ly, lz, spin, s;
    if (phase === "windup") {
      lx = THREE.MathUtils.lerp(-0.9, -1.15, k);
      ly = THREE.MathUtils.lerp(-0.05, -0.25, k);
      lz = THREE.MathUtils.lerp(-2.2, -2.45, k);
      // REVERSED cock around X
      spin = THREE.MathUtils.lerp(-0.9, -1.2, k);
      s = THREE.MathUtils.lerp(1.25, 1.4, k);
    } else if (phase === "release") {
      const u = k;
      lx = THREE.MathUtils.lerp(-1.1, 0.1, u);
      ly = THREE.MathUtils.lerp(-0.2, 0.35, Math.sin(u * Math.PI));
      lz = THREE.MathUtils.lerp(-2.4, -2.9, u);
      // REVERSED flip into the board
      spin = THREE.MathUtils.lerp(-1.2, -Math.PI * 2, u);
      s = THREE.MathUtils.lerp(1.4, 1.25, u);
    } else {
      const u = k;
      lx = THREE.MathUtils.lerp(0.1, 0.02, u);
      ly = THREE.MathUtils.lerp(0.3, 0.1, u);
      lz = THREE.MathUtils.lerp(-2.9, -3.3, u);
      spin = THREE.MathUtils.lerp(-Math.PI * 2, -Math.PI * 4, u);
      s = THREE.MathUtils.lerp(1.25, 1.1, u);
    }

    const local = new THREE.Vector3(lx, ly, lz);
    local.applyMatrix4(camera.matrixWorld);
    local.z = Math.max(local.z, WALL_Z + 1.15);
    axe.position.copy(local);
    axe.scale.setScalar(s);

    orientAxeTowardTarget(spin);
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
  const wood = makeWoodMaps(1024, 2048);
  wood.map.colorSpace = THREE.SRGBColorSpace;
  wood.map.wrapS = wood.map.wrapT = THREE.RepeatWrapping;
  wood.map.repeat.set(1, 2);
  wood.roughnessMap.wrapS = wood.roughnessMap.wrapT = THREE.RepeatWrapping;
  wood.bumpMap.wrapS = wood.bumpMap.wrapT = THREE.RepeatWrapping;

  const plankMat = new THREE.MeshStandardMaterial({
    map: wood.map,
    roughnessMap: wood.roughnessMap,
    bumpMap: wood.bumpMap,
    bumpScale: 0.028,
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.25,
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
      [1.0, 0.96, 0.88],
      [0.96, 0.9, 0.8],
      [0.9, 0.84, 0.72],
      [0.98, 0.92, 0.82],
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
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
      envMapIntensity: 0.15,
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

/** Small deterministic noise helpers for organic procedural maps */
function _hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function _noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = _hash2(xi, yi);
  const b = _hash2(xi + 1, yi);
  const c = _hash2(xi, yi + 1);
  const d = _hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function _fbm(x, y, oct = 4) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * _noise2(x * f, y * f);
    a *= 0.5;
    f *= 2.05;
  }
  return v;
}

/** Target planks — natural oak with soft rings, pores, weathered face */
function makeWoodMaps(w = 1024, h = 2048) {
  const color = document.createElement("canvas");
  color.width = w;
  color.height = h;
  const ctx = color.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      // Slow across-grain variation + fine longitudinal grain
      const ring = _fbm(nx * 6.5 + _fbm(nx * 2, ny * 0.4, 2) * 1.2, ny * 0.15, 5);
      const grain = _fbm(nx * 28 + Math.sin(ny * 18) * 0.4, ny * 3.5, 4);
      const pore = _noise2(nx * 90, ny * 55);
      const stain = _fbm(nx * 1.8, ny * 1.2, 3);

      let t = 0.42 + ring * 0.28 + grain * 0.12 + stain * 0.08;
      t = Math.max(0.15, Math.min(0.92, t));
      // Warm oak palette
      let r = 118 + t * 95;
      let g = 78 + t * 72;
      let b = 42 + t * 38;
      // Dark pore flecks (open-grain oak)
      if (pore > 0.78) {
        const p = (pore - 0.78) / 0.22;
        r -= 55 * p;
        g -= 40 * p;
        b -= 28 * p;
      }
      // Subtle cool sapwood streak
      if (ring > 0.72) {
        r += 8;
        g += 6;
        b += 4;
      }
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Soft knots (drawn after so they sit on top)
  for (let k = 0; k < 4; k++) {
    const kx = 60 + Math.random() * (w - 120);
    const ky = 80 + Math.random() * (h - 160);
    const kr = 14 + Math.random() * 22;
    for (let r = kr; r > 2; r -= 1.5) {
      ctx.strokeStyle = `rgba(48,28,12,${0.1 + (kr - r) / kr * 0.28})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(kx, ky, r, r * (0.55 + Math.random() * 0.2), 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(36,20,8,0.45)";
    ctx.beginPath();
    ctx.ellipse(kx, ky, 3.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Weathered axe scars
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.strokeStyle = `rgba(28,14,6,${0.1 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (Math.random() - 0.5) * 20,
      y + 10 + Math.random() * 18,
      x + (Math.random() - 0.5) * 36,
      y + 14 + Math.random() * 28
    );
    ctx.stroke();
  }

  const rough = document.createElement("canvas");
  rough.width = w;
  rough.height = h;
  const rctx = rough.getContext("2d");
  const rimg = rctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = _fbm(x / w * 20, y / h * 8, 4);
      const v = Math.floor(95 + n * 110);
      const i = (y * w + x) * 4;
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = v;
      rimg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);

  const bump = document.createElement("canvas");
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext("2d");
  const bimg = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = _fbm(x / w * 22 + 3, y / h * 6, 5);
      const v = Math.floor(100 + n * 90);
      const i = (y * w + x) * 4;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = v;
      bimg.data[i + 3] = 255;
    }
  }
  bctx.putImageData(bimg, 0, 0);

  const map = new THREE.CanvasTexture(color);
  const roughnessMap = new THREE.CanvasTexture(rough);
  const bumpMap = new THREE.CanvasTexture(bump);
  map.anisotropy = 8;
  roughnessMap.anisotropy = 4;
  bumpMap.anisotropy = 4;
  return { map, roughnessMap, bumpMap };
}

function makeDarkWoodMaps(w = 512, h = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = _fbm(x / w * 10, y / h * 14, 4);
      const t = 0.25 + n * 0.35;
      const i = (y * w + x) * 4;
      img.data[i] = 28 + t * 50;
      img.data[i + 1] = 18 + t * 32;
      img.data[i + 2] = 10 + t * 18;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  return { map, roughnessMap: new THREE.CanvasTexture(c), bumpMap: map };
}

/** Weathered chalk paint — thin over wood, worn edges */
function makePaintMaps(hex) {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const base = hex.replace("#", "");
  const br = parseInt(base.slice(0, 2), 16);
  const bg = parseInt(base.slice(2, 4), 16);
  const bb = parseInt(base.slice(4, 6), 16);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const brush = _fbm(x / w * 14, y / h * 3.5, 4);
      const wear = _fbm(x / w * 7 + 2, y / h * 7, 3);
      const speck = _noise2(x * 0.4, y * 0.4);
      let k = 0.82 + brush * 0.22 - wear * 0.12;
      if (speck > 0.88) k *= 0.75;
      const i = (y * w + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, br * k + (brush - 0.5) * 18));
      img.data[i + 1] = Math.max(0, Math.min(255, bg * k + (brush - 0.5) * 14));
      img.data[i + 2] = Math.max(0, Math.min(255, bb * k + (brush - 0.5) * 10));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const r = document.createElement("canvas");
  r.width = w;
  r.height = h;
  const rctx = r.getContext("2d");
  const rimg = rctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = _fbm(x / w * 18, y / h * 8, 3);
      const v = Math.floor(130 + n * 80);
      const i = (y * w + x) * 4;
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = v;
      rimg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);

  return {
    map: new THREE.CanvasTexture(c),
    roughnessMap: new THREE.CanvasTexture(r),
  };
}

/** Forged carbon steel — fine mill brush, soft patina, polished edge */
function makeSteelMaps() {
  const w = 1024;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      // Horizontal mill finish
      const brush = _noise2(nx * 2, ny * 220) * 0.55 + _noise2(nx * 0.5, ny * 90) * 0.45;
      const large = _fbm(nx * 3, ny * 2.5, 3);
      const pit = _noise2(nx * 60, ny * 60);
      // Soft heat tint near center-left
      const heat = Math.exp(-((nx - 0.35) ** 2 * 8 + (ny - 0.45) ** 2 * 6));

      let v = 168 + brush * 48 + large * 14;
      let r = v + 6;
      let g = v + 5;
      let b = v + 4;
      // Soft oil tint — keep subtle so metal stays silver, not blue plastic
      r += heat * 8;
      g += heat * 4;
      b += heat * 14;
      // Cutting-edge polish (right side brighter / cleaner)
      const edge = Math.max(0, (nx - 0.68) / 0.32);
      r += edge * 42;
      g += edge * 42;
      b += edge * 40;
      // Micro pits
      if (pit > 0.86) {
        const p = (pit - 0.86) / 0.14;
        r -= 40 * p;
        g -= 38 * p;
        b -= 35 * p;
      }
      const i = (y * w + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, r));
      img.data[i + 1] = Math.max(0, Math.min(255, g));
      img.data[i + 2] = Math.max(0, Math.min(255, b));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Longer hand scratches
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(12,16,22,${0.06 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.2;
    const y = Math.random() * h;
    const x = Math.random() * w * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 + Math.random() * 80, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }

  // Roughness map
  const rc = document.createElement("canvas");
  rc.width = w;
  rc.height = h;
  const rctx = rc.getContext("2d");
  const rimg = rctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const brush = _noise2(nx * 2, y / h * 200);
      let v = 110 + brush * 90;
      // Glossy edge
      v *= 1 - Math.max(0, (nx - 0.7) / 0.3) * 0.7;
      v = Math.max(25, Math.min(220, v));
      const i = (y * w + x) * 4;
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = v;
      rimg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);

  // Metalness
  const mc = document.createElement("canvas");
  mc.width = w;
  mc.height = h;
  const mctx = mc.getContext("2d");
  const mimg = mctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pit = _noise2(x / w * 50, y / h * 50);
      let v = 230 - (pit > 0.85 ? 50 : 0);
      const i = (y * w + x) * 4;
      mimg.data[i] = mimg.data[i + 1] = mimg.data[i + 2] = v;
      mimg.data[i + 3] = 255;
    }
  }
  mctx.putImageData(mimg, 0, 0);

  // Bump from brush
  const bc = document.createElement("canvas");
  bc.width = w;
  bc.height = h;
  const bctx = bc.getContext("2d");
  const bimg = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const brush = _noise2(x / w * 3, y / h * 240);
      const v = Math.floor(110 + brush * 70);
      const i = (y * w + x) * 4;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = v;
      bimg.data[i + 3] = 255;
    }
  }
  bctx.putImageData(bimg, 0, 0);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const roughnessMap = new THREE.CanvasTexture(rc);
  roughnessMap.anisotropy = 4;
  const metalnessMap = new THREE.CanvasTexture(mc);
  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.anisotropy = 4;
  return { map, roughnessMap, metalnessMap, bumpMap };
}

/** Oiled hickory handle — tight grain, soft value shifts, hand wear */
function makeHandleWoodMaps() {
  const w = 512;
  const h = 2048;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      // Cylinder-like darkening at edges (round handle read)
      const edge = Math.pow(Math.abs(nx - 0.5) * 2, 1.6);
      // Longitudinal grain with gentle wave
      const wave = Math.sin(ny * 14 + _fbm(nx * 2, ny * 2, 2) * 3) * 0.08;
      const grain = _fbm(nx * 18 + wave * 4, ny * 2.2, 5);
      const fine = _fbm(nx * 55, ny * 8, 3);
      const oil = Math.exp(-((ny - 0.52) ** 2) * 7) * (1 - edge * 0.5);

      let t = 0.48 + grain * 0.22 + fine * 0.08 - edge * 0.22 + oil * 0.06;
      // Grip zone slightly lighter (worn)
      if (ny > 0.72) t += (ny - 0.72) * 0.25 * _noise2(nx * 30, ny * 20);

      t = Math.max(0.12, Math.min(0.9, t));
      // Natural hickory — amber, not cartoon orange
      let r = 92 + t * 110;
      let g = 58 + t * 78;
      let b = 30 + t * 40;
      // Pore dashes along grain
      if (fine > 0.72 && grain < 0.45) {
        r -= 28;
        g -= 22;
        b -= 14;
      }
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Tiny end-grain hints near tip / butt
  for (let i = 0; i < 10; i++) {
    const y = 20 + i * 12;
    ctx.strokeStyle = `rgba(55,30,12,${0.06 + i * 0.01})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(w / 2, y, 18 + i * 1.5, 5 + i * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const y = h - 20 - i * 12;
    ctx.strokeStyle = `rgba(55,30,12,${0.06 + i * 0.01})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(w / 2, y, 18 + i * 1.5, 5 + i * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hairline checks
  for (let i = 0; i < 5; i++) {
    const x = 40 + Math.random() * (w - 80);
    ctx.strokeStyle = `rgba(30,15,8,${0.12 + Math.random() * 0.15})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.15 + Math.random() * h * 0.2);
    let xx = x;
    for (let y = 0; y < h * 0.5; y += 20) {
      xx += (Math.random() - 0.5) * 2;
      ctx.lineTo(xx, h * 0.15 + y);
    }
    ctx.stroke();
  }

  const rough = document.createElement("canvas");
  rough.width = w;
  rough.height = h;
  const rctx = rough.getContext("2d");
  const rimg = rctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      const grain = _fbm(nx * 20, ny * 3, 4);
      let v = 140 + grain * 60;
      // Oiled mid = glossier (darker in roughness map)
      const oil = Math.exp(-((ny - 0.5) ** 2) * 6);
      v -= oil * 70;
      // Grip = drier
      if (ny > 0.75) v += 35;
      v = Math.max(40, Math.min(220, v));
      const i = (y * w + x) * 4;
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = v;
      rimg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);

  const bump = document.createElement("canvas");
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext("2d");
  const bimg = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = _fbm(x / w * 24, y / h * 4, 5);
      const v = Math.floor(105 + n * 75);
      const i = (y * w + x) * 4;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = v;
      bimg.data[i + 3] = 255;
    }
  }
  bctx.putImageData(bimg, 0, 0);

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

/** Worn leather wrap — soft pores, subtle stitch */
function makeLeatherMaps() {
  const w = 512;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = _fbm(x / w * 12, y / h * 12, 5);
      const pore = _noise2(x / w * 40, y / h * 40);
      let t = 0.35 + n * 0.4;
      if (pore > 0.75) t *= 0.82;
      const i = (y * w + x) * 4;
      img.data[i] = 70 + t * 70;
      img.data[i + 1] = 14 + t * 22;
      img.data[i + 2] = 10 + t * 14;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 14; i++) {
    const y = 18 + i * 34;
    ctx.strokeStyle = "rgba(200,140,110,0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(w - 10, y + (Math.random() - 0.5));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const bump = document.createElement("canvas");
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext("2d");
  const bimg = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = _fbm(x / w * 20, y / h * 20, 4);
      const v = Math.floor(100 + n * 70);
      const i = (y * w + x) * 4;
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = v;
      bimg.data[i + 3] = 255;
    }
  }
  bctx.putImageData(bimg, 0, 0);
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
  for (let i = 0; i < 14; i++) {
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.03 + Math.random() * 0.05, 0.008, 0.02 + Math.random() * 0.035),
      mat
    );
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
    const r = 0.12 + Math.random() * 0.28;
    chip.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.85, 0.1 + Math.random() * 0.18);
    chip.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
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
    bumpScale: 0.038,
    roughness: 0.58,
    metalness: 0.03,
    color: 0xffffff,
    envMapIntensity: 0.45,
  });

  const steelMaps = makeSteelMaps();
  const steel = new THREE.MeshPhysicalMaterial({
    map: steelMaps.map,
    roughnessMap: steelMaps.roughnessMap,
    metalnessMap: steelMaps.metalnessMap,
    bumpMap: steelMaps.bumpMap,
    bumpScale: 0.008,
    roughness: 0.14,
    metalness: 1.0,
    envMapIntensity: 2.6,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
    color: 0xffffff,
  });
  const steelDark = new THREE.MeshPhysicalMaterial({
    map: steelMaps.map,
    roughnessMap: steelMaps.roughnessMap,
    metalnessMap: steelMaps.metalnessMap,
    bumpMap: steelMaps.bumpMap,
    bumpScale: 0.007,
    color: 0xe8ecf2,
    roughness: 0.22,
    metalness: 1.0,
    envMapIntensity: 2.1,
    clearcoat: 0.2,
    clearcoatRoughness: 0.35,
  });
  const leather = makeLeatherMaps();
  const wrapMat = new THREE.MeshStandardMaterial({
    map: leather.map,
    bumpMap: leather.bumpMap,
    bumpScale: 0.035,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.04,
    envMapIntensity: 0.2,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    map: handleWood.map,
    roughnessMap: handleWood.roughnessMap,
    bumpMap: handleWood.bumpMap,
    bumpScale: 0.04,
    color: 0xc4a07a,
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.2,
  });

  // Slightly higher segment count so grain wraps cleanly
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.062, 1.55, 28),
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
