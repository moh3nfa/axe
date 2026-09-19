/**
 * Iran Axe Throwing — fully procedural Three.js scroll engine
 * No photos. Camera orbit + 3D axe flight via ScrollTrigger.
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

  // —— Lights ——
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

  // —— Ground ——
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

  // —— Fully virtual target ——
  const targetGroup = new THREE.Group();
  scene.add(targetGroup);
  buildVirtualTarget(targetGroup);

  // Bullseye world anchor (front face of wall)
  const BULL = new THREE.Vector3(0.12, 1.55, 0.02);

  // —— Procedural 3D axe (no photo decal) ——
  const axe = buildAxe();
  axe.visible = false;
  scene.add(axe);

  const axeLight = new THREE.PointLight(0xffe0c0, 28, 10, 1.6);
  scene.add(axeLight);
  const axeRim = new THREE.PointLight(0x88aaff, 10, 6, 2);
  scene.add(axeRim);

  // impact flash
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffe8d0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), flashMat);
  flash.position.copy(BULL).add(new THREE.Vector3(0, 0, 0.12));
  scene.add(flash);

  // splinters / chips on impact
  const chips = buildChips();
  chips.visible = false;
  chips.position.copy(BULL);
  scene.add(chips);

  const state = { progress: 0 };

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
      yaw = THREE.MathUtils.lerp(0.32, 1.0, easeInOut(k));
      pitch = THREE.MathUtils.lerp(0.12, 0.26, k);
      radius = THREE.MathUtils.lerp(6.0, 4.9, k);
      lookY = THREE.MathUtils.lerp(1.4, 1.0, k);
      fov = THREE.MathUtils.lerp(42, 39, k);
      axe.visible = true;
      axePhase = "windup";
      axeK = k;
      heroFade(1 - k);
      throwFade(k);
    } else if (t < 0.55) {
      const k = (t - 0.32) / 0.23;
      yaw = THREE.MathUtils.lerp(1.0, -0.5, easeInOut(k));
      pitch = THREE.MathUtils.lerp(0.26, 0.04, k);
      radius = THREE.MathUtils.lerp(4.9, 4.1, k);
      lookY = THREE.MathUtils.lerp(1.0, 1.4, k);
      fov = THREE.MathUtils.lerp(39, 35, k);
      axe.visible = true;
      axePhase = "release";
      axeK = k;
      heroFade(0);
      throwFade(1);
    } else if (t < 0.75) {
      const k = (t - 0.55) / 0.2;
      yaw = THREE.MathUtils.lerp(-0.5, -0.95, easeInOut(k));
      pitch = THREE.MathUtils.lerp(0.04, -0.1, k);
      radius = THREE.MathUtils.lerp(4.1, 3.5, k);
      lookY = THREE.MathUtils.lerp(1.4, 1.5, k);
      fov = THREE.MathUtils.lerp(35, 33, k);
      axe.visible = true;
      axePhase = "flight";
      axeK = k;
      heroFade(0);
      throwFade(1);
    } else if (t < 0.9) {
      const k = (t - 0.75) / 0.15;
      yaw = THREE.MathUtils.lerp(-0.95, -0.18, easeInOut(k));
      pitch = THREE.MathUtils.lerp(-0.1, 0.02, k);
      radius = THREE.MathUtils.lerp(3.5, 2.85, k);
      lookY = 1.55;
      fov = THREE.MathUtils.lerp(33, 31, k);
      axe.visible = true;
      axePhase = "approach";
      axeK = k;
      heroFade(0);
      throwFade(1);
    } else {
      const k = (t - 0.9) / 0.1;
      // Wide side angle — clear read of handle sticking OUT of the board
      yaw = THREE.MathUtils.lerp(-0.18, 0.95, easeOut(k));
      pitch = THREE.MathUtils.lerp(0.02, 0.18, k);
      radius = THREE.MathUtils.lerp(2.85, 3.1, easeOut(k));
      lookY = 1.35;
      fov = THREE.MathUtils.lerp(31, 36, k);
      axe.visible = true;
      axePhase = "impact";
      axeK = k;
      heroFade(0);
      throwFade(1);
      flash.material.opacity = Math.sin(Math.min(k, 1) * Math.PI) * 0.85;
      chips.visible = k > 0.15;
      chips.scale.setScalar(0.55 + k * 0.8);
    }

    const cx = Math.sin(yaw) * Math.cos(pitch) * radius;
    const cy = 1.15 + Math.sin(pitch) * radius * 0.85;
    const cz = Math.cos(yaw) * Math.cos(pitch) * radius;
    camera.position.set(cx, cy, cz);
    camera.lookAt(BULL.x, lookY, 0);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    targetGroup.rotation.y = yaw * -0.1;
    targetGroup.position.x = yaw * -0.15;

    if (axePhase) placeAxe(axeK, axePhase);

    if (axe.visible) {
      axeLight.position.copy(axe.position).add(new THREE.Vector3(0.4, 0.5, 0.7));
      axeLight.intensity = 32;
      axeRim.position.copy(axe.position).add(new THREE.Vector3(-0.5, 0.2, 0.4));
      axeRim.intensity = 12;
    } else {
      axeLight.intensity = 2;
      axeRim.intensity = 0;
    }
  }

  /**
   * Stuck pose helpers — map local head (+Y) into the wall (-Z),
   * keep the handle (−Y) on the camera side of the board face.
   */
  const EYE_LOCAL = new THREE.Vector3(0, 0.22, 0);
  const BLADE_TIP_LOCAL = new THREE.Vector3(0.0, 0.95, 0);
  const INTO_WALL = new THREE.Vector3(0, 0, -1);

  function applyStuckPose(bite = 0.05, twist = 0.15) {
    // Near-profile stuck: handle swings out to the side+down, tip kisses wood
    const outDir = new THREE.Vector3(0.82, -0.4, 0.4).normalize();
    const intoDir = outDir.clone().negate();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      intoDir
    );
    const qTwist = new THREE.Quaternion().setFromAxisAngle(intoDir, twist);
    axe.quaternion.copy(qTwist).multiply(q);

    const tip = BLADE_TIP_LOCAL.clone().applyQuaternion(axe.quaternion);
    const tipWorld = new THREE.Vector3(BULL.x, BULL.y, BULL.z - bite);
    axe.position.copy(tipWorld).sub(tip);

    // Pull whole axe out along board normal until eye is clearly proud
    const eyeNow = EYE_LOCAL.clone().applyQuaternion(axe.quaternion).add(axe.position);
    const minEyeZ = BULL.z + 0.35;
    if (eyeNow.z < minEyeZ) {
      axe.position.z += minEyeZ - eyeNow.z;
    }
    // Re-seat tip depth after the pull (only steel may go back in)
    const tipNow = BLADE_TIP_LOCAL.clone().applyQuaternion(axe.quaternion).add(axe.position);
    if (tipNow.z > BULL.z - 0.02) {
      axe.position.z -= tipNow.z - (BULL.z - bite);
    }
    // Final eye check wins over tip if conflict — never bury wood
    const eye2 = EYE_LOCAL.clone().applyQuaternion(axe.quaternion).add(axe.position);
    if (eye2.z < minEyeZ) {
      axe.position.z += minEyeZ - eye2.z;
    }
    axe.scale.setScalar(stuckScale);
  }

  const stuckScale = 1.05;

  function placeAxe(k, phase) {
    if (phase === "approach" || phase === "impact") {
      if (phase === "approach") {
        const ease = easeInOut(k);
        // Start: in air in front of board
        const airPos = new THREE.Vector3(0.1, 1.8, 1.7);
        const airQ = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(-0.4, 0.6, Math.PI * 3.6, "XYZ")
        );
        // End: stuck pose (compute into temps)
        applyStuckPose(0.05, 0.4);
        const endPos = axe.position.clone();
        const endQ = axe.quaternion.clone();
        axe.position.lerpVectors(airPos, endPos, ease);
        axe.quaternion.slerpQuaternions(airQ, endQ, ease);
        axe.scale.setScalar(THREE.MathUtils.lerp(1.15, stuckScale, ease));
      } else {
        applyStuckPose(0.06 + easeOut(k) * 0.03, 0.4);
      }
      axe.visible = true;
      return;
    }

    // Camera-space placement for windup / release / flight
    let lx, ly, lz, spin, tumbleY, tumbleX, s;
    if (phase === "windup") {
      lx = THREE.MathUtils.lerp(-0.85, -1.1, k);
      ly = THREE.MathUtils.lerp(-0.12, -0.32, k);
      lz = THREE.MathUtils.lerp(-2.15, -2.35, k);
      spin = THREE.MathUtils.lerp(-0.45, -1.15, k);
      tumbleY = THREE.MathUtils.lerp(0.55, 1.1, k);
      tumbleX = THREE.MathUtils.lerp(0.18, 0.42, k);
      s = THREE.MathUtils.lerp(1.3, 1.5, k);
    } else if (phase === "release") {
      const u = k;
      lx = THREE.MathUtils.lerp(-1.05, 0.12, u);
      ly = THREE.MathUtils.lerp(-0.28, 0.32, Math.sin(u * Math.PI));
      lz = THREE.MathUtils.lerp(-2.3, -3.0, u);
      spin = THREE.MathUtils.lerp(-1.15, Math.PI * 2.3, u);
      tumbleY = THREE.MathUtils.lerp(1.1, -1.15, u);
      tumbleX = THREE.MathUtils.lerp(0.42, 0.9, u);
      s = THREE.MathUtils.lerp(1.5, 1.35, u);
    } else {
      // flight
      const u = k;
      lx = THREE.MathUtils.lerp(0.12, 0.04, u);
      ly = THREE.MathUtils.lerp(0.28, 0.08, u);
      lz = THREE.MathUtils.lerp(-3.0, -3.6, u);
      spin = Math.PI * 2.3 + u * Math.PI * 2.4;
      tumbleY = THREE.MathUtils.lerp(-1.15, 0.85, u);
      tumbleX = THREE.MathUtils.lerp(0.9, 0.55, u);
      s = THREE.MathUtils.lerp(1.35, 1.1, u);
    }

    const local = new THREE.Vector3(lx, ly, lz);
    local.applyMatrix4(camera.matrixWorld);
    axe.position.copy(local);
    axe.quaternion.copy(camera.quaternion);
    axe.rotateX(tumbleX);
    axe.rotateY(tumbleY);
    axe.rotateZ(spin);
    axe.scale.setScalar(s);
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
      const v = axe.position.clone().project(camera);
      const tip = new THREE.Vector3(0.0, 0.95, 0).applyMatrix4(axe.matrixWorld);
      const grip = new THREE.Vector3(0, -1.15, 0).applyMatrix4(axe.matrixWorld);
      const eye = new THREE.Vector3(0, 0.22, 0).applyMatrix4(axe.matrixWorld);
      return {
        progress: state.progress,
        visible: axe.visible,
        tip: tip.toArray().map((n) => +n.toFixed(3)),
        eye: eye.toArray().map((n) => +n.toFixed(3)),
        grip: grip.toArray().map((n) => +n.toFixed(3)),
        wallZ: BULL.z,
        handleClear: eye.z > BULL.z + 0.05 && grip.z > BULL.z + 0.4,
        tipInWood: tip.z < BULL.z + 0.05,
      };
    },
  };
}

/** Procedural wood-plank target with painted rings — no photos */
function buildVirtualTarget(group) {
  const woodTex = makeWoodTexture();
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;

  const plankMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.88,
    metalness: 0.03,
  });

  // Backing board made of vertical planks
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
    // slight color variation
    const shade = 0.92 + (i % 3) * 0.04;
    plank.material.color.setRGB(shade, shade * 0.88, shade * 0.72);
    plank.position.set(-totalW / 2 + plankW * 0.5 + i * plankW, 1.4, -0.14);
    plank.castShadow = true;
    plank.receiveShadow = true;
    // tiny random depth jitter for realism
    plank.position.z += ((i * 17) % 5) * 0.004;
    group.add(plank);
  }

  // Frame rails
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

  // Painted rings on front face (z ≈ 0.02)
  const ringZ = 0.02;
  const cx = 0.12;
  const cy = 1.55;

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

  paintRing(1.42, 1.28, 0x2a5f9e); // blue
  paintRing(0.92, 0.78, 0xc41e12); // red
  const bull = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 48),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55, roughnessMap: null })
  );
  bull.position.set(cx, cy, ringZ + 0.005);
  group.add(bull);

  // Small green killer shot
  const green = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 32),
    new THREE.MeshStandardMaterial({ color: 0x1f9d55, roughness: 0.6 })
  );
  green.position.set(cx - 1.45, cy + 0.55, ringZ + 0.005);
  group.add(green);
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
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb8956a,
    roughness: 0.9,
  });
  for (let i = 0; i < 10; i++) {
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 + Math.random() * 0.06, 0.01, 0.03 + Math.random() * 0.04),
      mat
    );
    const a = (i / 10) * Math.PI * 2;
    chip.position.set(Math.cos(a) * 0.25, Math.sin(a) * 0.2, 0.08 + Math.random() * 0.1);
    chip.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(chip);
  }
  return g;
}

/** Pure procedural throwing axe — no photo textures */
function buildAxe() {
  const g = new THREE.Group();

  const wood = new THREE.MeshStandardMaterial({
    color: 0xc9955c,
    roughness: 0.58,
    metalness: 0.06,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0xf2f5fa,
    roughness: 0.18,
    metalness: 1.0,
    emissive: 0x445566,
    emissiveIntensity: 0.35,
  });
  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x8a94a4,
    roughness: 0.28,
    metalness: 0.95,
    emissive: 0x222833,
    emissiveIntensity: 0.2,
  });
  const lacquer = new THREE.MeshStandardMaterial({
    color: 0x8b1a12,
    roughness: 0.45,
    metalness: 0.15,
  });

  // Handle along +Y (head) / -Y (grip) — stops BEFORE the steel head
  // so wood never crosses the board face on impact
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.068, 1.55, 24),
    wood
  );
  handle.position.y = -0.55;
  handle.castShadow = true;
  g.add(handle);

  // Red wrap near grip
  const wrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.08, 0.26, 16),
    lacquer
  );
  wrap.position.y = -1.05;
  wrap.castShadow = true;
  g.add(wrap);

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.085, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.7 })
  );
  grip.position.y = -1.32;
  grip.castShadow = true;
  g.add(grip);

  // Steel collar — fat and bright so impact reads as metal-in-wood
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.16, 20),
    steel
  );
  collar.position.y = 0.18;
  collar.castShadow = true;
  g.add(collar);

  // Head block
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.22), steelDark);
  head.position.set(0.04, 0.42, 0);
  head.castShadow = true;
  g.add(head);

  // Big bearded blade extending +Y into the tip
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.05, 0);
  bladeShape.lineTo(0.28, 0.1);
  bladeShape.lineTo(0.32, 0.4);
  bladeShape.lineTo(0.05, 0.7);
  bladeShape.lineTo(-0.22, 0.38);
  bladeShape.lineTo(-0.16, 0.06);
  bladeShape.closePath();
  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 3,
    }),
    steel
  );
  blade.position.set(0.0, 0.4, -0.03);
  blade.castShadow = true;
  g.add(blade);

  const poll = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.2), steelDark);
  poll.position.set(-0.08, 0.4, 0);
  g.add(poll);

  return g;
}
