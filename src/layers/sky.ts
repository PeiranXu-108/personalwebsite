import * as THREE from 'three'

import type { SkyPreset } from '../presets/types.ts'

export const skyVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const skyFragment = `
uniform float uSunProgress;
uniform vec3 uTopColor;
uniform vec3 uUpperColor;
uniform vec3 uHorizonColor;
uniform vec3 uWarmColor;
uniform float uWarmStrength;
varying vec2 vUv;

void main() {
  float y = vUv.y;
  vec3 color = mix(uHorizonColor, uUpperColor, smoothstep(0.18, 0.64, y));
  color = mix(color, uTopColor, smoothstep(0.7, 1.0, y));

  float warm = smoothstep(0.35, 0.92, uSunProgress);
  color = mix(color, uWarmColor, warm * (1.0 - y) * uWarmStrength);

  gl_FragColor = vec4(color, 1.0);
}
`

export function createSkyMaterial(sky: SkyPreset, sunProgress: number) {
  return new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: false,
    uniforms: {
      uSunProgress: { value: sunProgress },
      uTopColor: { value: new THREE.Color(sky.topColor) },
      uUpperColor: { value: new THREE.Color(sky.upperColor) },
      uHorizonColor: { value: new THREE.Color(sky.horizonColor) },
      uWarmColor: { value: new THREE.Color(sky.warmColor) },
      uWarmStrength: { value: sky.warmStrength }
    },
    vertexShader: skyVertex,
    fragmentShader: skyFragment
  })
}
