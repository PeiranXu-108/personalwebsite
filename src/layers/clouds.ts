import * as THREE from 'three'

import type { WatercolorCloudLayerConfig } from '../cloudLayers.ts'

export type CloudVisualLayer = {
  layer: WatercolorCloudLayerConfig
  z: number
  baseX: number
  baseY: number
  parallaxX: number
  parallaxY: number
  bandCenter: number
  bandThickness: number
  bandFeather: number
  opacity: number
  scale: readonly [number, number]
  drift: readonly [number, number]
  shadowStrength: number
  billowDepth: number
  rollStrength: number
  horizonWeight: number
  highLayer: boolean
  shadowColor: string
  midColor: string
  lightColor: string
}

export type CloudMaterialOptions = {
  sunProgress: number
  aspect: number
  reduceMotion: boolean
}

export const cloudVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const cloudFragment = `
uniform float uTime;
uniform float uSunProgress;
uniform float uAspect;
uniform vec2 uSun;
uniform vec2 uScale;
uniform vec2 uDrift;
uniform float uBandCenter;
uniform float uBandThickness;
uniform float uBandFeather;
uniform float uOpacity;
uniform float uLayerAltitude;
uniform float uLayerHeight;
uniform float uDensityScale;
uniform float uShapeAmount;
uniform float uShapeDetailAmount;
uniform float uCoverageFilterWidth;
uniform float uHighLayer;
uniform float uShadowStrength;
uniform float uBillowDepth;
uniform float uRollStrength;
uniform float uHorizonWeight;
uniform float uMotionScale;
uniform vec3 uShadowColor;
uniform vec3 uMidColor;
uniform vec3 uLightColor;
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

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(19.17, 7.31);
    a *= 0.52;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 wideUv = vec2((uv.x - 0.5) * uAspect + 0.5, uv.y);
  float altitude01 = clamp(uLayerAltitude / 8200.0, 0.0, 1.0);
  float height01 = clamp(uLayerHeight / 1400.0, 0.0, 1.0);
  float density = clamp(uDensityScale * mix(2.85, 46.0, uHighLayer), 0.0, 1.0);
  float speed = mix(0.014, 0.026, uHighLayer) * uMotionScale;
  vec2 flow = uDrift * uTime * speed;

  vec2 p = vec2(
    wideUv.x * uScale.x + flow.x,
    (uv.y + uBandCenter * 0.4) * uScale.y + flow.y
  );
  vec2 slowRoll = vec2(
    sin((p.y + uTime * 0.018 * uMotionScale) * 1.45),
    cos((p.x - uTime * 0.014 * uMotionScale) * 1.18)
  ) * uRollStrength * (1.0 - uHighLayer * 0.62);
  vec2 rollingP = p + slowRoll;
  float broad = fbm(rollingP);
  float detail = fbm(rollingP * 2.55 + vec2(4.2, -2.8 + uTime * 0.012 * uMotionScale));
  float billow = fbm(rollingP * 1.42 + vec2(detail * 1.2, broad * -1.4));
  float paper = fbm(vec2(wideUv.x * 15.0 - uTime * 0.006 * uMotionScale, uv.y * 26.0));
  float rows = sin((uv.y + broad * 0.08 + billow * 0.05) * mix(72.0, 46.0, uHighLayer) + broad * 6.0);
  float rowWash = rows * 0.5 + 0.5;
  float shape = mix(broad, broad * 0.68 + detail * 0.32, clamp(uShapeDetailAmount, 0.0, 1.0));
  shape = mix(shape, shape * 0.62 + billow * 0.38, uBillowDepth);
  shape = mix(shape, shape * 0.84 + rowWash * 0.16, uShapeAmount);
  shape += (paper - 0.5) * mix(0.17, 0.1, uHighLayer);
  float upperLeftLift = (1.0 - smoothstep(0.1, 0.72, uv.x)) *
    smoothstep(0.58, 0.94, uv.y) *
    uHighLayer;
  shape += upperLeftLift * 0.16;

  float lower = smoothstep(
    uBandCenter - uBandThickness - uBandFeather,
    uBandCenter - uBandThickness,
    uv.y
  );
  float upper = 1.0 - smoothstep(
    uBandCenter + uBandThickness,
    uBandCenter + uBandThickness + uBandFeather,
    uv.y
  );
  float band = lower * upper;
  float lowSea = 1.0 - smoothstep(0.34, 0.74, uv.y);
  float horizonPress = mix(0.72, 1.0 + lowSea * 0.34, uHorizonWeight);
  band *= mix(horizonPress, 1.0, uHighLayer);

  float coverage = clamp(uCoverageFilterWidth, 0.0, 1.0);
  float threshold = mix(0.74, 0.4, density) + coverage * 0.08 + altitude01 * 0.05 - uHighLayer * 0.22;
  threshold -= uHorizonWeight * lowSea * 0.16;
  float softness = mix(0.2, 0.34, coverage);
  float cloud = smoothstep(threshold - softness, threshold + softness * 0.34, shape);
  cloud = pow(cloud, mix(1.12, 1.62, uHighLayer));
  cloud = mix(cloud, max(cloud, smoothstep(0.38, 0.8, billow) * 0.72), uBillowDepth * lowSea);

  float streak = smoothstep(0.2, 0.88, fbm(vec2(rollingP.x * 0.64, rollingP.y * 0.2)));
  float upperThread = smoothstep(0.18, 0.95, rowWash);
  cloud *= mix(1.0, streak * (0.5 + upperThread * 0.5), uHighLayer * 0.82);
  cloud *= band;

  float sunDist = distance(uv, uSun);
  float sunWarm = smoothstep(0.92, 0.05, sunDist);
  float edgeGlow = smoothstep(threshold - 0.02, threshold + 0.2, shape) *
    (1.0 - smoothstep(threshold + 0.22, threshold + 0.42, shape));
  float topLight = smoothstep(uBandCenter - uBandThickness * 0.25, uBandCenter + uBandThickness, uv.y);
  float backLight = smoothstep(0.62, 0.03, sunDist) * smoothstep(0.18, 0.78, lowSea + topLight);
  float valleyDepth = smoothstep(0.0, 0.58, 1.0 - abs(uv.y - uBandCenter) / max(uBandThickness, 0.001));
  float internalShadow = smoothstep(0.52, 0.12, rowWash) * smoothstep(0.36, 0.86, billow) * lowSea;

  vec3 color = mix(uShadowColor, uMidColor, smoothstep(0.16, 0.82, shape + height01 * 0.1));
  color = mix(color, uLightColor, clamp(sunWarm * 0.5 + topLight * 0.08 + edgeGlow * 0.44 + backLight * 0.34, 0.0, 1.0));
  color = mix(color, color * vec3(0.62, 0.72, 0.94), (valleyDepth + internalShadow * 0.76) * uShadowStrength * (1.0 - sunWarm * 0.65) * (1.0 - uHighLayer * 0.45));
  color = mix(color, uShadowColor * 0.94, upperLeftLift * (1.0 - sunWarm) * 0.16);
  color += uLightColor * (sunWarm * edgeGlow + backLight) * mix(0.08, 0.2, 1.0 - uHighLayer);

  float alpha = cloud * uOpacity;
  alpha *= mix(0.72, 1.36, density);
  alpha *= mix(0.9, 1.18, height01);
  alpha *= 0.82 + uSunProgress * 0.24;
  alpha *= mix(0.86, 1.09, paper);
  alpha *= 1.0 + lowSea * uHorizonWeight * 0.38;
  alpha *= 1.0 + upperLeftLift * 0.58;
  alpha = clamp(alpha, 0.0, mix(0.82, 0.46, uHighLayer));

  gl_FragColor = vec4(color, alpha);
}
`

export function createCloudMaterial(
  visualLayer: CloudVisualLayer,
  { sunProgress, aspect, reduceMotion }: CloudMaterialOptions
) {
  const { layer } = visualLayer
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uSunProgress: { value: sunProgress },
      uAspect: { value: aspect },
      uSun: {
        value: new THREE.Vector2(
          visualLayer.highLayer ? 0.73 : 0.79,
          visualLayer.highLayer ? 0.78 : 0.64
        )
      },
      uScale: { value: new THREE.Vector2(...visualLayer.scale) },
      uDrift: { value: new THREE.Vector2(...visualLayer.drift) },
      uBandCenter: { value: visualLayer.bandCenter },
      uBandThickness: { value: visualLayer.bandThickness },
      uBandFeather: { value: visualLayer.bandFeather },
      uOpacity: { value: visualLayer.opacity },
      uLayerAltitude: { value: layer.altitude },
      uLayerHeight: { value: layer.height },
      uDensityScale: { value: layer.densityScale },
      uShapeAmount: { value: layer.shapeAmount },
      uShapeDetailAmount: { value: layer.shapeDetailAmount },
      uCoverageFilterWidth: { value: layer.coverageFilterWidth },
      uHighLayer: { value: visualLayer.highLayer ? 1 : 0 },
      uShadowStrength: { value: visualLayer.shadowStrength },
      uBillowDepth: { value: visualLayer.billowDepth },
      uRollStrength: { value: visualLayer.rollStrength },
      uHorizonWeight: { value: visualLayer.horizonWeight },
      uMotionScale: { value: reduceMotion ? 0.34 : 1 },
      uShadowColor: { value: new THREE.Color(visualLayer.shadowColor) },
      uMidColor: { value: new THREE.Color(visualLayer.midColor) },
      uLightColor: { value: new THREE.Color(visualLayer.lightColor) }
    },
    vertexShader: cloudVertex,
    fragmentShader: cloudFragment
  })
}
