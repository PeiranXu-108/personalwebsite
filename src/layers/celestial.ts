import * as THREE from 'three'

import type { FireflyPreset, MoonPreset, StarPreset } from '../presets/types.ts'

const coverVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const moonFragment = `
uniform float uTime;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uHaloRadius;
uniform float uOpacity;
uniform vec3 uMoonColor;
uniform vec3 uHaloColor;
varying vec2 vUv;

void main() {
  vec2 p = vec2((vUv.x - uCenter.x) * uAspect, vUv.y - uCenter.y);
  float dist = length(p);
  float disc = smoothstep(uRadius, uRadius * 0.82, dist);
  float inner = smoothstep(uRadius * 0.82, 0.0, dist);
  float halo = exp(-dist * 8.0) * (1.0 - smoothstep(uHaloRadius * 0.72, uHaloRadius, dist));
  float pearl = 0.9 + sin(uTime * 0.34) * 0.04;
  vec3 color = mix(uHaloColor, uMoonColor, disc);
  color += uMoonColor * inner * 0.32;
  float alpha = clamp((halo * 0.48 + disc * 0.88 + inner * 0.14) * uOpacity * pearl, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`

const starsFragment = `
uniform float uTime;
uniform float uAspect;
uniform float uDensity;
uniform float uOpacity;
uniform float uTwinkleStrength;
uniform float uMotionScale;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.7, 289.3))) * 43758.5453123);
}

void main() {
  vec2 wideUv = vec2((vUv.x - 0.5) * uAspect + 0.5, vUv.y);
  vec2 cells = vec2(74.0, 46.0);
  vec2 cell = floor(wideUv * cells);
  vec2 local = fract(wideUv * cells) - 0.5;
  float rnd = hash(cell);
  float gate = step(1.0 - uDensity * 0.115, rnd);
  float size = mix(0.028, 0.07, hash(cell + 19.4));
  float point = smoothstep(size, 0.0, length(local));
  float upperSky = smoothstep(0.36, 0.72, vUv.y);
  float moonAvoid = smoothstep(0.09, 0.28, distance(vUv, vec2(0.78, 0.76)));
  float twinkle = 1.0 + sin(uTime * uMotionScale * (0.7 + rnd * 1.6) + rnd * 9.4) * uTwinkleStrength;
  vec3 color = mix(vec3(0.62, 0.78, 1.0), vec3(1.0, 0.96, 0.78), hash(cell + 3.1));
  float alpha = gate * point * upperSky * moonAvoid * twinkle * uOpacity;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.86));
}
`

const fireflyVertex = `
attribute vec3 instanceOffset;
attribute float instanceScale;
attribute float instancePhase;
attribute float instanceIntensity;

uniform float uTime;
uniform float uMotionScale;

varying vec2 vLocal;
varying float vGlow;

void main() {
  vLocal = uv * 2.0 - 1.0;
  float bob = sin(uTime * uMotionScale * 0.7 + instancePhase) * 0.08;
  float drift = sin(uTime * uMotionScale * 0.38 + instancePhase * 1.7) * 0.1;
  vGlow = instanceIntensity * (0.72 + sin(uTime * uMotionScale * 1.8 + instancePhase) * 0.28);
  vec3 world = vec3(position.xy * instanceScale + instanceOffset.xy + vec2(drift, bob), instanceOffset.z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`

const fireflyFragment = `
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uOpacity;
varying vec2 vLocal;
varying float vGlow;

void main() {
  float dist = length(vLocal);
  float core = smoothstep(0.2, 0.0, dist);
  float aura = smoothstep(1.0, 0.0, dist);
  vec3 color = mix(uGlowColor, uColor, core);
  color += uColor * core * 0.34;
  float alpha = (core * 1.18 + aura * 0.46) * vGlow * uOpacity;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.92));
}
`

export function createMoonMaterial(moon: MoonPreset, aspect: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: aspect },
      uCenter: { value: new THREE.Vector2(...moon.center) },
      uRadius: { value: moon.radius },
      uHaloRadius: { value: moon.haloRadius },
      uOpacity: { value: moon.opacity },
      uMoonColor: { value: new THREE.Color(moon.color) },
      uHaloColor: { value: new THREE.Color(moon.haloColor) }
    },
    vertexShader: coverVertex,
    fragmentShader: moonFragment
  })
}

export function createStarsMaterial(stars: StarPreset, aspect: number, reduceMotion: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: aspect },
      uDensity: { value: stars.density },
      uOpacity: { value: stars.opacity },
      uTwinkleStrength: { value: stars.twinkleStrength },
      uMotionScale: { value: reduceMotion ? 0.2 : 1 }
    },
    vertexShader: coverVertex,
    fragmentShader: starsFragment
  })
}

export function createFireflyField(fireflies: FireflyPreset, reduceMotion: boolean) {
  const count = window.innerWidth < 720 ? fireflies.mobileCount : fireflies.desktopCount
  const base = new THREE.PlaneGeometry(1, 1, 1, 1)
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.index = base.index
  geometry.attributes.position = base.attributes.position
  geometry.attributes.uv = base.attributes.uv

  const offsets = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  const phases = new Float32Array(count)
  const intensities = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const lowerCluster = Math.random() < 0.76
    const x = THREE.MathUtils.randFloat(-12.4, 12.4)
    const y = lowerCluster
      ? THREE.MathUtils.randFloat(-5.55, -2.18)
      : THREE.MathUtils.randFloat(-3.1, -0.55)
    const z = lowerCluster
      ? THREE.MathUtils.randFloat(18.2, 25.4)
      : THREE.MathUtils.randFloat(14.6, 21.6)
    offsets.set([x, y, z], i * 3)
    scales[i] = THREE.MathUtils.randFloat(lowerCluster ? 0.13 : 0.1, lowerCluster ? 0.38 : 0.26)
    phases[i] = Math.random() * Math.PI * 2
    intensities[i] = THREE.MathUtils.randFloat(0.72, 1.4)
  }

  geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))
  geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1))
  geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1))
  geometry.setAttribute('instanceIntensity', new THREE.InstancedBufferAttribute(intensities, 1))
  geometry.instanceCount = count

  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uMotionScale: { value: reduceMotion ? 0.18 : 1 },
      uColor: { value: new THREE.Color(fireflies.color) },
      uGlowColor: { value: new THREE.Color(fireflies.glowColor) },
      uOpacity: { value: fireflies.opacity }
    },
    vertexShader: fireflyVertex,
    fragmentShader: fireflyFragment
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  return { mesh, material }
}
