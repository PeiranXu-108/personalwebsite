import * as THREE from 'three'

export const sunRaysVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const sunRaysFragment = `
uniform float uTime;
uniform float uSunProgress;
uniform vec2 uSun;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 fromSun = vUv - uSun;
  float dist = length(fromSun);
  float angle = atan(fromSun.y, fromSun.x);
  float rayNoise = noise(vec2(angle * 4.3, uTime * 0.055));
  float streaks = smoothstep(0.48, 0.92, rayNoise) * pow(max(0.0, 1.0 - dist * 1.06), 2.2);
  float horizonGate = smoothstep(0.18, 0.78, 1.0 - vUv.y);
  float cloudGate = smoothstep(0.18, 0.58, dist);
  float core = exp(-dist * 21.0);
  float halo = exp(-dist * 4.2);
  float pulse = 0.94 + sin(uTime * 0.85) * 0.06;
  vec3 color = vec3(1.0, 0.76, 0.36) * (core * 1.12 + halo * 0.32 + streaks * cloudGate * horizonGate * 0.42);
  float alpha = clamp((core * 0.65 + halo * 0.34 + streaks * 0.34) * pulse * (0.58 + uSunProgress * 0.24), 0.0, 0.56);
  gl_FragColor = vec4(color, alpha);
}
`

export function createSunRaysMaterial(sunProgress: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunProgress: { value: sunProgress },
      uSun: { value: new THREE.Vector2(0.79, 0.67) }
    },
    vertexShader: sunRaysVertex,
    fragmentShader: sunRaysFragment
  })
}
