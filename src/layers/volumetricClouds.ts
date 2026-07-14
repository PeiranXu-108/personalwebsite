import * as THREE from 'three'

import type { CloudVisualLayer } from './clouds.ts'

export type VolumetricCloudMaterialOptions = {
  aspect: number
  reduceMotion: boolean
  sunProgress: number
}

const volumetricCloudVertex = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const volumetricCloudFragment = `
uniform float uTime;
uniform float uSunProgress;
uniform float uAspect;
uniform float uMotionScale;
uniform float uCameraHeight;
uniform float uViewTilt;
uniform float uCoverage;
uniform vec2 uSun;
uniform vec3 uShadowColor;
uniform vec3 uMidColor;
uniform vec3 uLightColor;
varying vec2 vUv;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), u.x),
      mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), u.x),
      mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

float fbm3(vec3 p) {
  float value = 0.0;
  float amplitude = 0.56;
  for (int octave = 0; octave < 3; octave++) {
    value += noise3(p) * amplitude;
    p = p.yzx * 2.01 + vec3(13.1, 7.7, 5.3);
    amplitude *= 0.48;
  }
  return value;
}

vec3 sampleCloud(vec3 worldPosition) {
  float flowTime = uTime * uMotionScale;
  vec3 drift = vec3(
    flowTime * 0.055,
    sin(flowTime * 0.21) * 0.08,
    flowTime * -0.035
  );
  vec3 broadPosition = worldPosition * vec3(0.42, 0.54, 0.38) + drift;
  vec2 weatherFlow = vec2(flowTime * 0.012, flowTime * -0.008);
  float weather = noise3(vec3(worldPosition.xz * 0.071 + weatherFlow, 1.7));
  float broad = fbm3(broadPosition);
  vec3 detailPosition = broadPosition.yzx * 1.32 + vec3(broad * 1.18, weather * 0.72, -broad * 0.68);
  vec3 counterFlow = vec3(
    flowTime * -0.11,
    flowTime * 0.075 + sin(flowTime * 0.31) * 0.055,
    flowTime * 0.09
  );
  detailPosition += counterFlow;
  float roundedDetail = noise3(detailPosition);
  float verticalRoll = 0.5 + 0.5 * sin(
    worldPosition.x * 0.34 -
    worldPosition.z * 0.27 +
    flowTime * 0.72 +
    broad * 3.2
  );
  float rolledHeight = worldPosition.y + (verticalRoll - 0.5) * 0.18;
  float height01 = clamp((rolledHeight + 0.42) / 2.18, 0.0, 1.0);
  float baseProfile = smoothstep(0.0, 0.16, height01);
  float topStart = 0.3 + broad * 0.38 + weather * 0.2 + (verticalRoll - 0.5) * 0.085;
  float topProfile = 1.0 - smoothstep(topStart, topStart + 0.26, height01);
  float profile = baseProfile * topProfile;
  float threshold = mix(0.82, 0.62, uCoverage) - weather * 0.1;
  float shape = broad * 0.86 + roundedDetail * 0.16 + weather * 0.12 + (verticalRoll - 0.5) * 0.045;
  float softBody = smoothstep(threshold - 0.065, threshold + 0.075, shape);
  float density = softBody * profile;
  float sunFacing = smoothstep(
    0.22,
    0.88,
    broad * 0.58 + roundedDetail * 0.15 + height01 * 0.34 + verticalRoll * 0.12
  );
  return vec3(density, sunFacing, height01);
}

void main() {
  vec2 screen = vUv * 2.0 - 1.0;
  screen.x *= uAspect;

  vec3 rayOrigin = vec3(0.0, uCameraHeight, -6.4);
  vec3 rayDirection = normalize(vec3(screen.x * 0.43, screen.y * 0.43 - uViewTilt, 1.0));
  vec4 volume = vec4(0.0);

  if (rayDirection.y < -0.004) {
    float cloudTop = 1.72;
    float cloudBottom = -0.46;
    float nearDistance = max(0.0, (cloudTop - rayOrigin.y) / rayDirection.y);
    float farDistance = min(58.0, (cloudBottom - rayOrigin.y) / rayDirection.y);
    float rayLength = max(0.0, farDistance - nearDistance);
    float stepLength = rayLength / 32.0;
    float jitter = fract(52.9829189 * fract(gl_FragCoord.x * 0.06711056 + gl_FragCoord.y * 0.00583715));
    float travel = nearDistance + stepLength * mix(0.22, 0.78, jitter);
    float sunGlow = exp(-distance(vUv, uSun) * 4.1);

    for (int stepIndex = 0; stepIndex < 32; stepIndex++) {
      if (travel > farDistance || volume.a > 0.96) break;

      vec3 worldPosition = rayOrigin + rayDirection * travel;
      vec3 cloud = sampleCloud(worldPosition);
      float distanceFade = 1.0 - smoothstep(31.0, 58.0, travel);
      float grazingFade = smoothstep(0.028, 0.118, -rayDirection.y);
      float density = cloud.x * distanceFade * grazingFade;
      float opticalDepth = density * stepLength * 1.9;
      float sampleAlpha = 1.0 - exp(-opticalDepth);
      float silverLining = pow(cloud.y, 2.1) * (0.24 + sunGlow * 0.78);
      float underside = 1.0 - smoothstep(0.04, 0.68, cloud.z);
      float lightAmount = clamp(0.25 + cloud.y * 0.42 + silverLining - underside * 0.22, 0.0, 1.0);
      vec3 deepShadow = mix(uShadowColor * vec3(0.76, 0.8, 0.95), uMidColor, 0.14);
      vec3 sampleColor = mix(deepShadow, uMidColor, lightAmount);
      sampleColor = mix(sampleColor, uLightColor, clamp(silverLining + sunGlow * cloud.y * 0.24, 0.0, 0.82));
      sampleColor *= 0.92 + cloud.z * 0.12;

      float remaining = 1.0 - volume.a;
      volume.rgb += remaining * sampleColor * sampleAlpha;
      volume.a += remaining * sampleAlpha;
      travel += stepLength;
    }
  }

  vec2 highPosition = vec2(
    (vUv.x - 0.5) * uAspect * 1.08 + uTime * 0.011 * uMotionScale,
    vUv.y * 2.2 - uTime * 0.005 * uMotionScale
  );
  float highBroad = fbm3(vec3(highPosition, 5.4));
  float highDetail = noise3(vec3(highPosition * vec2(2.1, 1.45), 11.8));
  float upperLeftMass = (1.0 - smoothstep(0.14, 0.82, vUv.x)) * 0.32;
  float highShape = highBroad * 0.9 + highDetail * 0.1 + upperLeftMass;
  float highMask = smoothstep(0.34, 0.56, highShape) * smoothstep(0.56, 0.72, vUv.y) * 0.72;
  float highSunWarmth = exp(-distance(vUv, uSun) * 5.2);
  highMask *= mix(0.78, 0.46, highSunWarmth);

  float highLight = clamp(0.18 + highDetail * 0.46 + vUv.x * 0.22, 0.0, 1.0);
  vec3 highShadow = uShadowColor * vec3(0.64, 0.7, 0.9);
  vec3 highColor = mix(highShadow, uMidColor, highLight);
  highColor = mix(highColor, uLightColor, highSunWarmth * 0.72);

  float highRemaining = 1.0 - volume.a;
  vec3 color = volume.rgb + highColor * highMask * highRemaining;
  float alpha = volume.a + highMask * highRemaining;

  float horizonWarmth = exp(-abs(vUv.y - 0.64) * 10.0) * smoothstep(0.18, 0.78, vUv.x);
  color = mix(color, uLightColor * alpha, horizonWarmth * (0.08 + uSunProgress * 0.08));
  alpha *= 0.9 + uSunProgress * 0.1;

  gl_FragColor = vec4(color / max(alpha, 0.001), clamp(alpha, 0.0, 0.95));
}
`

export function createVolumetricCloudMaterial(
  visualLayers: readonly CloudVisualLayer[],
  { aspect, reduceMotion, sunProgress }: VolumetricCloudMaterialOptions
) {
  const lowLayer = visualLayers.find(layer => !layer.highLayer) ?? visualLayers[0]
  const middleLayer = visualLayers.find(
    layer => !layer.highLayer && layer !== lowLayer
  ) ?? lowLayer

  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunProgress: { value: sunProgress },
      uAspect: { value: aspect },
      uMotionScale: { value: reduceMotion ? 0.2 : 1 },
      uCameraHeight: { value: 2.42 },
      uViewTilt: { value: 0.148 },
      uCoverage: { value: 0.66 },
      uSun: { value: new THREE.Vector2(0.79, 0.67) },
      uShadowColor: { value: new THREE.Color(lowLayer?.shadowColor ?? '#7894c5') },
      uMidColor: { value: new THREE.Color(middleLayer?.midColor ?? '#eef4fb') },
      uLightColor: { value: new THREE.Color(lowLayer?.lightColor ?? '#fff0bb') }
    },
    vertexShader: volumetricCloudVertex,
    fragmentShader: volumetricCloudFragment
  })
}
