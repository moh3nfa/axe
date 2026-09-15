/**
 * Iran Axe Throwing — Three.js scroll engine
 * Camera orbit + 3D axe flight driven by ScrollTrigger
 */
import * as THREE from "three";

export function createThrowEngine(canvas) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0908, 0.035);

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
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 1.2, 6.5);

  // —— Lights ——
  scene.add(new THREE.AmbientLight(0xfff0e0, 0.45));

  const key = new THREE.DirectionalLight(0xffe2c8, 2.1);
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

  const warm = new THREE.PointLight(0xff5533, 18, 20, 2);
  warm.position.set(0, 2.5, 2);
  scene.add(warm);

  // —— Ground ——
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({
      color: 0x1a1410,
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.6;
  ground.receiveShadow = true;
  scene.add(ground);

  // —— Target wall ——
  const loader = new THREE.TextureLoader();
  const targetGroup = new THREE.Group();
  scene.add(targetGroup);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xc4a882,
    roughness: 0.85,
    metalness: 0.02,
  });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 6.4, 0.35), wallMat);
  wall.position.set(0, 1.4, -0.2);
  wall.castShadow = true;
  wall.receiveShadow = true;
  targetGroup.add(wall);

  // painted rings
  const ringGroup = new THREE.Group();
  ringGroup.position.set(0.15, 1.55, 0.02);
  targetGroup.add(ringGroup);

  function makeRing(radius, color, thickness = 0.07) {
    const geo = new THREE.RingGeometry(radius - thickness, radius, 64);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = 0.01;
    return mesh;
  }
  ringGroup.add(makeRing(1.35, 0x2b6cb0, 0.09));
  ringGroup.add(makeRing(0.82, 0xc41e12, 0.1));
  const bull = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 48),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55 })
  );
  bull.position.z = 0.015;
  ringGroup.add(bull);

  const green = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 32),
    new THREE.MeshStandardMaterial({ color: 0x1f9d55 })
  );
  green.position.set(-1.55, 0.55, 0.015);
  ringGroup.add(green);

  // photo plate — fades down during throw so 3D reads clearly
  const photoTex = loader.load("assets/hero.jpg");
  photoTex.colorSpace = THREE.SRGBColorSpace;
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.0, 6.2),
    new THREE.MeshStandardMaterial({
      map: photoTex,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.88,
    })
  );
  photo.position.set(0, 1.4, 0.05);
  targetGroup.add(photo);

  // hit photo (with embedded axe) for impact crossfade
  const hitTex = loader.load("assets/hero-hit.jpg");
  hitTex.colorSpace = THREE.SRGBColorSpace;
  const hitPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(5.0, 6.2),
    new THREE.MeshStandardMaterial({
      map: hitTex,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0,
    })
  );
  hitPhoto.position.set(0, 1.4, 0.06);
  targetGroup.add(hitPhoto);

  // —— 3D Axe (procedural, LIFECAMP-like proportions) ——
  const axe = buildAxe(loader);
  axe.position.set(-2.8, 0.4, 3.2);
  axe.scale.setScalar(1.45);
  scene.add(axe);

  // follow light on axe — bright so steel/wood read in flight
  const axeLight = new THREE.PointLight(0xffe0c0, 28, 10, 1.6);
  scene.add(axeLight);
  const axeRim = new THREE.PointLight(0x88aaff, 10, 6, 2);
  scene.add(axeRim);

  // impact flash sprite
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffe8d0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), flashMat);
  flash.position.set(0.15, 1.55, 0.2);
  scene.add(flash);

  // —— Camera path state ——
  const state = {
    progress: 0,
    // camera spherical-ish controls
    camYaw: 0,
    camPitch: 0.12,
    camRadius: 6.5,
    camTargetY: 1.3,
    camFov: 42,
  };

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

  // map scroll progress 0..1 → scene
  function setProgress(p) {
    state.progress = THREE.MathUtils.clamp(p, 0, 1);
    const t = state.progress;

    // phases
    // 0.00–0.18 hero / idle
    // 0.18–0.32 wind-up
    // 0.32–0.55 release
    // 0.55–0.75 mid flight
    // 0.75–0.90 approach
    // 0.90–1.00 impact

    // Camera orbit
    let yaw, pitch, radius, lookY, fov;
    if (t < 0.18) {
      const k = t / 0.18;
      yaw = THREE.MathUtils.lerp(0.15, 0.35, k);
      pitch = THREE.MathUtils.lerp(0.1, 0.14, k);
      radius = THREE.MathUtils.lerp(6.4, 6.0, k);
      lookY = 1.35;
      fov = 42;
      axe.visible = false;
      heroFade(1 - k * 0.15);
      throwFade(0);
      hitPhoto.material.opacity = 0;
      flash.material.opacity = 0;
      photo.material.opacity = 0.88;
    } else if (t < 0.32) {
      const k = (t - 0.18) / 0.14;
      yaw = THREE.MathUtils.lerp(0.35, 1.05, easeInOut(k)); // strong over-shoulder
      pitch = THREE.MathUtils.lerp(0.14, 0.28, k);
      radius = THREE.MathUtils.lerp(6.0, 4.8, k);
      lookY = THREE.MathUtils.lerp(1.35, 0.95, k);
      fov = THREE.MathUtils.lerp(42, 39, k);
      axe.visible = true;
      placeAxe(k, "windup");
      heroFade(1 - k);
      throwFade(k);
      hitPhoto.material.opacity = 0;
      // peel photo away so 3D wall + axe read
      photo.material.opacity = THREE.MathUtils.lerp(0.88, 0.18, k);
    } else if (t < 0.55) {
      const k = (t - 0.32) / 0.23;
      yaw = THREE.MathUtils.lerp(1.05, -0.55, easeInOut(k)); // big swing
      pitch = THREE.MathUtils.lerp(0.28, 0.05, k);
      radius = THREE.MathUtils.lerp(4.8, 4.0, k);
      lookY = THREE.MathUtils.lerp(0.95, 1.35, k);
      fov = THREE.MathUtils.lerp(39, 35, k);
      placeAxe(k, "release");
      heroFade(0);
      throwFade(1);
      photo.material.opacity = THREE.MathUtils.lerp(0.18, 0.08, k);
    } else if (t < 0.75) {
      const k = (t - 0.55) / 0.2;
      yaw = THREE.MathUtils.lerp(-0.55, -1.05, easeInOut(k)); // chase from side
      pitch = THREE.MathUtils.lerp(0.05, -0.12, k);
      radius = THREE.MathUtils.lerp(4.0, 3.4, k);
      lookY = THREE.MathUtils.lerp(1.35, 1.5, k);
      fov = THREE.MathUtils.lerp(35, 33, k);
      placeAxe(k, "flight");
      photo.material.opacity = 0.06;
    } else if (t < 0.9) {
      const k = (t - 0.75) / 0.15;
      yaw = THREE.MathUtils.lerp(-1.05, -0.2, easeInOut(k));
      pitch = THREE.MathUtils.lerp(-0.12, 0.02, k);
      radius = THREE.MathUtils.lerp(3.4, 2.8, k);
      lookY = 1.55;
      fov = THREE.MathUtils.lerp(33, 31, k);
      placeAxe(k, "approach");
      photo.material.opacity = THREE.MathUtils.lerp(0.06, 0.35, k);
    } else {
      const k = (t - 0.9) / 0.1;
      yaw = THREE.MathUtils.lerp(-0.2, 0, k);
      pitch = THREE.MathUtils.lerp(0.02, 0, k);
      radius = THREE.MathUtils.lerp(2.8, 2.45, easeOut(k));
      lookY = 1.55;
      fov = THREE.MathUtils.lerp(31, 30, k);
      placeAxe(k, "impact");
      hitPhoto.material.opacity = THREE.MathUtils.smoothstep(k, 0.15, 0.65);
      photo.material.opacity = THREE.MathUtils.lerp(0.35, 0.1, k);
      flash.material.opacity = Math.sin(Math.min(k, 1) * Math.PI) * 0.9;
      if (k > 0.45) axe.visible = false;
    }

    const cx = Math.sin(yaw) * Math.cos(pitch) * radius;
    const cy = 1.2 + Math.sin(pitch) * radius * 0.9;
    const cz = Math.cos(yaw) * Math.cos(pitch) * radius;
    camera.position.set(cx, cy, cz);
    camera.lookAt(0.1, lookY, 0);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    targetGroup.rotation.y = yaw * -0.12;
    targetGroup.position.x = yaw * -0.2;

    if (axe.visible) {
      axeLight.position.copy(axe.position).add(new THREE.Vector3(0.5, 0.7, 1.0));
      axeLight.intensity = 32;
      axeRim.position.copy(axe.position).add(new THREE.Vector3(-0.6, 0.2, 0.5));
      axeRim.intensity = 14;
    } else {
      axeLight.intensity = 3;
      axeRim.intensity = 0;
    }
  }

  function placeAxe(k, phase) {
    // wide arc through camera space so the mesh stays readable
    const start = new THREE.Vector3(-2.4, 0.55, 4.2);
    const mid1 = new THREE.Vector3(-1.1, 2.55, 2.8);
    const mid2 = new THREE.Vector3(0.35, 2.35, 1.35);
    const end = new THREE.Vector3(0.15, 1.55, 0.32);

    let pos, spin, tumbleY, tumbleX, s;
    if (phase === "windup") {
      pos = start.clone().lerp(new THREE.Vector3(-2.7, 0.35, 4.4), k);
      spin = THREE.MathUtils.lerp(-0.7, -1.4, k);
      tumbleY = THREE.MathUtils.lerp(0.35, 0.95, k);
      tumbleX = 0.2;
      s = THREE.MathUtils.lerp(1.35, 1.55, k);
      axe.visible = true;
    } else if (phase === "release") {
      pos = cubic(start, mid1, mid2, end, k * 0.38);
      spin = THREE.MathUtils.lerp(-1.4, Math.PI * 2.0, k);
      tumbleY = THREE.MathUtils.lerp(0.95, -1.25, k);
      tumbleX = THREE.MathUtils.lerp(0.2, 0.85, k);
      s = THREE.MathUtils.lerp(1.55, 1.7, k);
    } else if (phase === "flight") {
      pos = cubic(start, mid1, mid2, end, 0.38 + k * 0.38);
      spin = Math.PI * 2.0 + k * Math.PI * 2.8;
      tumbleY = THREE.MathUtils.lerp(-1.25, 1.35, k);
      tumbleX = THREE.MathUtils.lerp(0.85, -0.5, k);
      s = THREE.MathUtils.lerp(1.7, 1.35, k);
    } else if (phase === "approach") {
      pos = cubic(start, mid1, mid2, end, 0.76 + k * 0.18);
      spin = Math.PI * 4.8 + k * Math.PI;
      tumbleY = THREE.MathUtils.lerp(1.35, 0.2, k);
      tumbleX = THREE.MathUtils.lerp(-0.5, 0.05, k);
      s = THREE.MathUtils.lerp(1.35, 0.95, k);
    } else {
      pos = cubic(start, mid1, mid2, end, 0.94 + k * 0.06);
      spin = Math.PI * 5.8 + k * 0.3;
      tumbleY = 0.05;
      tumbleX = 0;
      s = THREE.MathUtils.lerp(0.95, 0.7, k);
    }

    axe.position.copy(pos);
    axe.rotation.set(tumbleX, tumbleY, spin);
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

  function cubic(a, b, c, d, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    return new THREE.Vector3(
      mt3 * a.x + 3 * mt2 * t * b.x + 3 * mt * t2 * c.x + t3 * d.x,
      mt3 * a.y + 3 * mt2 * t * b.y + 3 * mt * t2 * c.y + t3 * d.y,
      mt3 * a.z + 3 * mt2 * t * b.z + 3 * mt * t2 * c.z + t3 * d.z
    );
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
    // idle micro motion
    if (state.progress < 0.05) {
      const t = performance.now() * 0.00025;
      camera.position.x += Math.sin(t) * 0.002;
      camera.position.y += Math.cos(t * 0.8) * 0.001;
    }
    renderer.render(scene, camera);
  }
  render();

  // init
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
  };
}

function buildAxe(loader) {
  const g = new THREE.Group();

  // Prefer photo texture plane for exact LIFECAMP look, with a light mesh body behind for volume
  const wood = new THREE.MeshStandardMaterial({
    color: 0xd4a574,
    roughness: 0.55,
    metalness: 0.08,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0xd0d6e0,
    roughness: 0.22,
    metalness: 0.95,
  });
  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x7a8494,
    roughness: 0.3,
    metalness: 0.92,
  });

  // handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.088, 1.95, 24),
    wood
  );
  handle.position.y = -0.55;
  handle.castShadow = true;
  g.add(handle);

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.38, 16),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.65 })
  );
  grip.position.y = -1.4;
  grip.castShadow = true;
  g.add(grip);

  // head block
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.2), steelDark);
  head.position.set(0.14, 0.5, 0);
  head.castShadow = true;
  g.add(head);

  // blade (bearded)
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0.22);
  bladeShape.lineTo(0.62, 0.32);
  bladeShape.lineTo(0.72, -0.05);
  bladeShape.lineTo(0.5, -0.4);
  bladeShape.lineTo(0.12, -0.18);
  bladeShape.lineTo(0, -0.06);
  bladeShape.closePath();
  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 3,
    }),
    steel
  );
  blade.position.set(-0.05, 0.5, -0.035);
  blade.castShadow = true;
  g.add(blade);

  const poll = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.18), steelDark);
  poll.position.set(-0.22, 0.55, 0);
  g.add(poll);

  // Photo decal for brand realism
  const axeTex = loader.load("assets/axe.png");
  axeTex.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 2.5),
    new THREE.MeshStandardMaterial({
      map: axeTex,
      transparent: true,
      roughness: 0.45,
      metalness: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x221100,
      emissiveIntensity: 0.15,
    })
  );
  decal.position.set(0.06, -0.12, 0.13);
  g.add(decal);

  // orient axe head-up like the photo
  g.rotation.z = 0;
  return g;
}
