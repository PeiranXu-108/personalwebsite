import * as THREE from 'three'

import type { GrassPreset } from '../presets/types.ts'

export const grassVertex = `
attribute vec3 instanceOffset;
attribute float instanceScale;
attribute float instanceAngle;
attribute float instancePhase;
attribute float instanceDepth;
attribute vec3 instanceColor;

uniform float uTime;
uniform float uWindStrength;
uniform vec2 uPointer;
uniform vec2 uPointerWorld;
uniform float uRippleTime;
uniform vec2 uRippleOrigin;

varying vec2 vUv;
varying float vHeight;
varying vec3 vColor;
varying float vSide;
varying float vDepth;

void main() {
  vUv = uv;
  vHeight = position.y;
  vColor = instanceColor;
  vSide = position.x;
  vDepth = instanceDepth;

  float heightCurve = vHeight * vHeight;
  float gust = sin(uTime * 1.35 + instancePhase + instanceOffset.x * 1.2) * 0.55 +
    sin(uTime * 2.8 + instancePhase * 1.7) * 0.22 +
    sin(uTime * 0.82 + instanceOffset.y * 1.15 + instanceOffset.x * 0.36) * 0.28 +
    sin(uTime * 4.1 + instancePhase * 2.0 + instanceOffset.y * 2.7) * 0.12;
  float pointerReach = 2.35;
  float pointerDistance = distance(instanceOffset.xy, uPointerWorld);
  float pointerWake = smoothstep(pointerReach, 0.0, pointerDistance);
  float pointerSide = clamp((instanceOffset.x - uPointerWorld.x) / max(pointerReach, 0.1), -1.0, 1.0);
  float pointerPush =
    uPointer.x * 0.12 +
    pointerWake * (pointerSide * 0.18 + uPointer.x * 0.08 + uPointer.y * 0.05);
  float rippleAge = max(0.0, uTime - uRippleTime);
  float rippleDistance = distance(instanceOffset.xy, uRippleOrigin);
  float rippleReach = 2.2;
  float ripple = sin(rippleDistance * 5.2 - rippleAge * 7.2) *
    exp(-rippleAge * 1.45) *
    smoothstep(rippleReach, 0.0, abs(rippleDistance - rippleAge * 1.32));
  float bend = (gust * uWindStrength + pointerPush + ripple * 0.42) * heightCurve;

  vec3 p = position;
  p.y *= instanceScale;
  p.x *= mix(0.62, 1.24, instanceScale) * mix(0.64, 1.18, instanceDepth);
  p.x += bend;

  float c = cos(instanceAngle);
  float s = sin(instanceAngle);
  vec2 rotated = vec2(c * p.x - s * p.y, s * p.x + c * p.y);

  vec3 world = vec3(rotated, p.z) + instanceOffset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`

export const grassFragment = `
uniform vec3 uBladeHighlightColor;
uniform vec3 uRootShadowColor;
varying vec2 vUv;
varying float vHeight;
varying vec3 vColor;
varying float vSide;
varying float vDepth;

void main() {
  float taper = smoothstep(0.62, 0.02, abs(vSide) / max(0.035, 0.09 * (1.0 - vHeight * 0.68)));
  float rootFade = smoothstep(0.0, 0.08, vHeight);
  float tipFade = smoothstep(1.0, 0.82, vHeight);
  float rootGrip = smoothstep(0.22, 0.0, vHeight);
  float inkEdge = smoothstep(0.14, 0.0, abs(vSide)) * 0.22;
  float rootInk = rootGrip * taper * mix(0.1, 0.18, vDepth);
  vec3 highlight = mix(vColor, uBladeHighlightColor, smoothstep(0.36, 1.0, vHeight) * mix(0.08, 0.2, vDepth));
  highlight = mix(highlight, uRootShadowColor, rootGrip * 0.34);
  float alpha = taper * max(rootFade, rootGrip * 0.46) * tipFade * mix(0.45, 0.6, vDepth);
  gl_FragColor = vec4(highlight + inkEdge + rootInk, alpha);
}
`

export const grassBaseVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const grassBaseFragment = `
uniform vec3 uBaseDeepColor;
uniform vec3 uBaseGreenColor;
uniform vec3 uBaseGoldColor;
uniform vec3 uBaseGlowColor;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float crest = 0.38 - uv.x * 0.16;
  float field = smoothstep(crest + 0.055, crest - 0.035, uv.y);
  float rootWeight = smoothstep(0.02, 0.58, uv.y);
  float lowerHold = 1.0 - smoothstep(0.0, 0.36, uv.y) * 0.22;
  float contactShadow = smoothstep(crest + 0.13, crest - 0.08, uv.y);
  float rootShelf = smoothstep(crest + 0.02, crest - 0.16, uv.y);

  vec3 color = mix(uBaseDeepColor, uBaseGreenColor, rootWeight);
  color = mix(color, uBaseGoldColor, smoothstep(0.36, 0.96, uv.x) * smoothstep(0.0, 0.48, uv.y) * 0.56);
  color = mix(color, uBaseGlowColor, smoothstep(0.62, 1.0, uv.x) * smoothstep(0.08, 0.44, uv.y) * 0.24);
  color = mix(color, uBaseDeepColor * vec3(0.82, 0.92, 0.9), contactShadow * 0.5);
  color = mix(color, uBaseGreenColor * 0.72, rootShelf * 0.18);

  float topFade = 1.0 - smoothstep(crest - 0.1, crest + 0.09, uv.y) * 0.26;
  float alpha = field * lowerHold * topFade * mix(0.76, 0.92, rootShelf);
  gl_FragColor = vec4(color, alpha);
}
`

export function makeColorPalette(colors: readonly string[]) {
  return colors.map((color) => new THREE.Color(color))
}

export function createGrassBaseMaterial(grass: GrassPreset) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uBaseDeepColor: { value: new THREE.Color(grass.baseDeepColor) },
      uBaseGreenColor: { value: new THREE.Color(grass.baseGreenColor) },
      uBaseGoldColor: { value: new THREE.Color(grass.baseGoldColor) },
      uBaseGlowColor: { value: new THREE.Color(grass.baseGlowColor) }
    },
    vertexShader: grassBaseVertex,
    fragmentShader: grassBaseFragment
  })
}

export function createGrassMaterial({
  grass,
  reduceMotion,
  pointer,
  pointerWorld,
  rippleTime,
  rippleOrigin
}: {
  grass: GrassPreset
  reduceMotion: boolean
  pointer: THREE.Vector2
  pointerWorld: THREE.Vector2
  rippleTime: number
  rippleOrigin: THREE.Vector2
}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWindStrength: { value: reduceMotion ? 0.08 : 0.68 },
      uPointer: { value: pointer },
      uPointerWorld: { value: pointerWorld },
      uRippleTime: { value: rippleTime },
      uRippleOrigin: { value: rippleOrigin },
      uBladeHighlightColor: { value: new THREE.Color(grass.bladeHighlightColor) },
      uRootShadowColor: { value: new THREE.Color(grass.rootShadowColor) }
    },
    vertexShader: grassVertex,
    fragmentShader: grassFragment
  })
}
