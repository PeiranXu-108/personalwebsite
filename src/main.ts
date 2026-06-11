import './styles.css'

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

import {
  watercolorCloudLayerConfigs,
  type WatercolorCloudLayerConfig
} from './cloudLayers'

const VIEW_HEIGHT = 12
const TERRAIN_LIFT = 0.34
const COVER_PLANE_OVERSCAN = 1.12
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

type CoverPlane = THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.ShaderMaterial | THREE.MeshBasicMaterial
>

type LayerGroup = THREE.Group & {
  userData: {
    baseX: number
    baseY: number
    parallaxX: number
    parallaxY: number
  }
}

type CloudVisualLayer = {
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
  highLayer: boolean
  shadowColor: string
  midColor: string
  lightColor: string
}

const cloudVisualLayers: readonly CloudVisualLayer[] = [
  {
    layer: watercolorCloudLayerConfigs[0],
    z: -82,
    baseX: -0.14,
    baseY: -0.1,
    parallaxX: 0.12,
    parallaxY: 0.07,
    bandCenter: 0.31,
    bandThickness: 0.2,
    bandFeather: 0.1,
    opacity: 0.84,
    scale: [2.1, 6.2],
    drift: [0.35, -0.04],
    shadowStrength: 0.52,
    highLayer: false,
    shadowColor: '#9da8d9',
    midColor: '#e9edf7',
    lightColor: '#fff0bc'
  },
  {
    layer: watercolorCloudLayerConfigs[1],
    z: -78,
    baseX: 0.22,
    baseY: 0.04,
    parallaxX: 0.16,
    parallaxY: 0.085,
    bandCenter: 0.39,
    bandThickness: 0.22,
    bandFeather: 0.13,
    opacity: 0.68,
    scale: [2.8, 7.4],
    drift: [-0.24, 0.03],
    shadowStrength: 0.44,
    highLayer: false,
    shadowColor: '#94a1cf',
    midColor: '#f3f2f1',
    lightColor: '#ffe7a4'
  },
  {
    layer: watercolorCloudLayerConfigs[2],
    z: -74,
    baseX: -0.08,
    baseY: 0.16,
    parallaxX: 0.1,
    parallaxY: 0.055,
    bandCenter: 0.5,
    bandThickness: 0.16,
    bandFeather: 0.16,
    opacity: 0.34,
    scale: [3.8, 8.8],
    drift: [0.16, 0.02],
    shadowStrength: 0.28,
    highLayer: false,
    shadowColor: '#b9b9dd',
    midColor: '#f7f3e7',
    lightColor: '#ffe2a0'
  },
  {
    layer: watercolorCloudLayerConfigs[3],
    z: -88,
    baseX: 0.02,
    baseY: 0,
    parallaxX: 0.045,
    parallaxY: 0.025,
    bandCenter: 0.84,
    bandThickness: 0.21,
    bandFeather: 0.18,
    opacity: 0.72,
    scale: [1.06, 11.6],
    drift: [0.22, 0.012],
    shadowStrength: 0.28,
    highLayer: true,
    shadowColor: '#697cb4',
    midColor: '#d2def8',
    lightColor: '#fff4c9'
  }
] as const

const skyVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const skyFragment = `
uniform float uSunProgress;
varying vec2 vUv;

void main() {
  float y = vUv.y;
  vec3 top = vec3(0.51, 0.63, 0.86);
  vec3 upper = vec3(0.80, 0.89, 0.96);
  vec3 horizon = vec3(1.0, 0.73, 0.37);
  vec3 color = mix(horizon, upper, smoothstep(0.18, 0.64, y));
  color = mix(color, top, smoothstep(0.7, 1.0, y));

  float warm = smoothstep(0.35, 0.92, uSunProgress);
  color = mix(color, color * vec3(1.11, 1.03, 0.9), warm * (1.0 - y) * 0.22);

  gl_FragColor = vec4(color, 1.0);
}
`

const cloudVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const cloudFragment = `
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
  float speed = mix(0.018, 0.032, uHighLayer);
  vec2 flow = uDrift * uTime * speed;

  vec2 p = vec2(
    wideUv.x * uScale.x + flow.x,
    (uv.y + uBandCenter * 0.4) * uScale.y + flow.y
  );
  float broad = fbm(p);
  float detail = fbm(p * 2.75 + vec2(4.2, -2.8));
  float paper = fbm(vec2(wideUv.x * 15.0 - uTime * 0.01, uv.y * 26.0));
  float rows = sin((uv.y + broad * 0.08) * mix(78.0, 46.0, uHighLayer) + broad * 6.0);
  float rowWash = rows * 0.5 + 0.5;
  float shape = mix(broad, broad * 0.68 + detail * 0.32, clamp(uShapeDetailAmount, 0.0, 1.0));
  shape = mix(shape, shape * 0.86 + rowWash * 0.14, uShapeAmount);
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
  float horizonPress = 1.0 - smoothstep(0.58, 0.92, uv.y);
  band *= mix(horizonPress, 1.0, uHighLayer);

  float coverage = clamp(uCoverageFilterWidth, 0.0, 1.0);
  float threshold = mix(0.73, 0.42, density) + coverage * 0.1 + altitude01 * 0.05 - uHighLayer * 0.22;
  float softness = mix(0.18, 0.31, coverage);
  float cloud = smoothstep(threshold - softness, threshold + softness * 0.34, shape);
  cloud = pow(cloud, mix(1.28, 1.62, uHighLayer));

  float streak = smoothstep(0.2, 0.88, fbm(vec2(p.x * 0.64, p.y * 0.2)));
  float upperThread = smoothstep(0.18, 0.95, rowWash);
  cloud *= mix(1.0, streak * (0.5 + upperThread * 0.5), uHighLayer * 0.82);
  cloud *= band;

  float sunDist = distance(uv, uSun);
  float sunWarm = smoothstep(0.92, 0.05, sunDist);
  float edgeGlow = smoothstep(threshold - 0.02, threshold + 0.2, shape) *
    (1.0 - smoothstep(threshold + 0.22, threshold + 0.42, shape));
  float topLight = smoothstep(uBandCenter - uBandThickness * 0.25, uBandCenter + uBandThickness, uv.y);
  float valleyDepth = smoothstep(0.0, 0.58, 1.0 - abs(uv.y - uBandCenter) / max(uBandThickness, 0.001));

  vec3 color = mix(uShadowColor, uMidColor, smoothstep(0.18, 0.82, shape + height01 * 0.1));
  color = mix(color, uLightColor, clamp(sunWarm * 0.64 + topLight * 0.07 + edgeGlow * 0.42, 0.0, 1.0));
  color = mix(color, color * vec3(0.7, 0.76, 0.95), valleyDepth * uShadowStrength * (1.0 - sunWarm) * (1.0 - uHighLayer * 0.45));
  color = mix(color, uShadowColor * 0.94, upperLeftLift * (1.0 - sunWarm) * 0.16);
  color += uLightColor * sunWarm * edgeGlow * mix(0.08, 0.18, uHighLayer);

  float alpha = cloud * uOpacity;
  alpha *= mix(0.72, 1.36, density);
  alpha *= mix(0.9, 1.18, height01);
  alpha *= 0.82 + uSunProgress * 0.24;
  alpha *= mix(0.86, 1.09, paper);
  alpha *= 1.0 + upperLeftLift * 0.58;
  alpha = clamp(alpha, 0.0, mix(0.72, 0.48, uHighLayer));

  gl_FragColor = vec4(color, alpha);
}
`

const sunRaysVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const sunRaysFragment = `
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

const grassVertex = `
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

const grassFragment = `
varying vec2 vUv;
varying float vHeight;
varying vec3 vColor;
varying float vSide;
varying float vDepth;

void main() {
  float taper = smoothstep(0.62, 0.02, abs(vSide) / max(0.035, 0.09 * (1.0 - vHeight * 0.68)));
  float rootFade = smoothstep(0.0, 0.08, vHeight);
  float tipFade = smoothstep(1.0, 0.82, vHeight);
  float inkEdge = smoothstep(0.14, 0.0, abs(vSide)) * 0.22;
  vec3 highlight = mix(vColor, vec3(1.0, 0.82, 0.34), smoothstep(0.36, 1.0, vHeight) * mix(0.08, 0.2, vDepth));
  float alpha = taper * rootFade * tipFade * mix(0.42, 0.56, vDepth);
  gl_FragColor = vec4(highlight + inkEdge, alpha);
}
`

const grassBaseVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const grassBaseFragment = `
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float crest = 0.38 - uv.x * 0.16;
  float field = smoothstep(crest + 0.055, crest - 0.035, uv.y);
  float rootWeight = smoothstep(0.02, 0.58, uv.y);
  float lowerHold = 1.0 - smoothstep(0.0, 0.36, uv.y) * 0.22;

  vec3 deep = vec3(0.09, 0.24, 0.22);
  vec3 green = vec3(0.32, 0.46, 0.26);
  vec3 gold = vec3(0.86, 0.72, 0.34);
  vec3 color = mix(deep, green, rootWeight);
  color = mix(color, gold, smoothstep(0.36, 0.96, uv.x) * smoothstep(0.0, 0.48, uv.y) * 0.56);
  color = mix(color, vec3(1.0, 0.82, 0.44), smoothstep(0.62, 1.0, uv.x) * smoothstep(0.08, 0.44, uv.y) * 0.24);

  float topFade = 1.0 - smoothstep(crest - 0.12, crest + 0.04, uv.y) * 0.46;
  float alpha = field * lowerHold * topFade * 0.64;
  gl_FragColor = vec4(color, alpha);
}
`

const watercolorPass = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uStrength: { value: 1 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uStrength;
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
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = vUv;
      float paper = fbm(uv * vec2(115.0, 86.0));
      float bleedNoise = fbm(uv * 6.0 + vec2(uTime * 0.018, -uTime * 0.011));
      vec2 wobble = vec2(bleedNoise - 0.5, paper - 0.5) * 0.0028 * uStrength;

      vec4 cleanBase = texture2D(tDiffuse, uv);
      vec4 base = texture2D(tDiffuse, uv + wobble);
      vec4 softA = texture2D(tDiffuse, uv + wobble + vec2(0.0022, 0.0));
      vec4 softB = texture2D(tDiffuse, uv + wobble + vec2(-0.0022, 0.0));
      vec4 softC = texture2D(tDiffuse, uv + wobble + vec2(0.0, 0.0018));
      vec3 color = mix(base.rgb, (base.rgb + softA.rgb + softB.rgb + softC.rgb) * 0.25, 0.21);

      float grain = noise(uv * vec2(430.0, 330.0));
      color *= mix(0.96, 1.06, paper);
      color += (grain - 0.5) * 0.024;
      color = min(color * 1.055 + vec3(0.012, 0.009, 0.002), vec3(1.0));
      color = pow(max(color, vec3(0.0)), vec3(0.96));

      float cleanSky = smoothstep(0.28, 0.48, uv.y);
      color = mix(color, cleanBase.rgb, cleanSky);
      gl_FragColor = vec4(color, mix(base.a, cleanBase.a, cleanSky));
    }
  `
}

class WatercolorSunriseScene {
  private scene = new THREE.Scene()
  private camera!: THREE.OrthographicCamera
  private renderer: THREE.WebGLRenderer
  private composer!: EffectComposer
  private clock = new THREE.Clock()
  private coverPlanes: CoverPlane[] = []
  private parallaxGroups: LayerGroup[] = []
  private shaderMaterials: THREE.ShaderMaterial[] = []
  private grassMaterial?: THREE.ShaderMaterial
  private watercolorShaderPass?: ShaderPass
  private viewWidth = VIEW_HEIGHT * window.innerWidth / window.innerHeight
  private viewHeight = VIEW_HEIGHT
  private pointer = new THREE.Vector2()
  private pointerTarget = new THREE.Vector2()
  private pointerWorld = new THREE.Vector2(0, -3.2)
  private pointerWorldTarget = new THREE.Vector2(0, -3.2)
  private rippleOrigin = new THREE.Vector2(0, -4.2)
  private rippleTime = -100
  private resizeFrame = 0
  private resizeObserver?: ResizeObserver
  private sunProgress = 0.58
  private targetSunProgress = 0.58
  private isVisible = true

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setClearColor(0xf7e4b3, 1)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, reduceMotion ? 1 : 1.2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
  }

  async init() {
    this.createCamera()
    this.createRendererPipeline()

    this.addSkyWash()
    this.addCloudLayers()
    this.addSunRays()
    this.addGrassBase()
    this.addGrassField()
    this.addPostProcessing()

    this.bindEvents()
    this.resize()
    this.animate()
  }

  private createCamera() {
    const { width, height } = this.getViewportSize()
    const aspect = width / height
    this.camera = new THREE.OrthographicCamera(
      -VIEW_HEIGHT * aspect / 2,
      VIEW_HEIGHT * aspect / 2,
      VIEW_HEIGHT / 2,
      -VIEW_HEIGHT / 2,
      0.1,
      500
    )
    this.camera.position.set(0, 0, 100)
  }

  private createRendererPipeline() {
    const { width, height } = this.getViewportSize()
    this.renderer.setSize(width, height, false)
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
  }

  private makeParallaxGroup(parallaxX: number, parallaxY: number): LayerGroup {
    const group = new THREE.Group() as LayerGroup
    group.userData = {
      baseX: 0,
      baseY: 0,
      parallaxX,
      parallaxY
    }
    this.scene.add(group)
    this.parallaxGroups.push(group)
    return group
  }

  private addCoverPlane(
    material: THREE.ShaderMaterial | THREE.MeshBasicMaterial,
    z: number,
    group: THREE.Object3D = this.scene
  ) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material) as CoverPlane
    mesh.position.z = z
    mesh.frustumCulled = false
    group.add(mesh)
    this.coverPlanes.push(mesh)
    if (material instanceof THREE.ShaderMaterial) {
      this.shaderMaterials.push(material)
    }
    return mesh
  }

  private addSkyWash() {
    const material = new THREE.ShaderMaterial({
      transparent: false,
      depthWrite: false,
      uniforms: {
        uSunProgress: { value: this.sunProgress }
      },
      vertexShader: skyVertex,
      fragmentShader: skyFragment
    })
    this.addCoverPlane(material, -96, this.makeParallaxGroup(0.05, 0.025))
  }

  private addSunRays() {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSunProgress: { value: this.sunProgress },
        uSun: { value: new THREE.Vector2(0.79, 0.67) }
      },
      vertexShader: sunRaysVertex,
      fragmentShader: sunRaysFragment
    })
    this.addCoverPlane(material, -70, this.makeParallaxGroup(0.075, 0.04))
  }

  private addCloudLayers() {
    for (const visualLayer of cloudVisualLayers) {
      const group = this.makeParallaxGroup(visualLayer.parallaxX, visualLayer.parallaxY)
      group.userData.baseX = visualLayer.baseX
      group.userData.baseY = visualLayer.baseY
      this.addCoverPlane(this.createCloudMaterial(visualLayer), visualLayer.z, group)
    }
  }

  private createCloudMaterial(visualLayer: CloudVisualLayer) {
    const { layer } = visualLayer
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uSunProgress: { value: this.sunProgress },
        uAspect: { value: this.viewWidth / this.viewHeight },
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
        uShadowColor: { value: new THREE.Color(visualLayer.shadowColor) },
        uMidColor: { value: new THREE.Color(visualLayer.midColor) },
        uLightColor: { value: new THREE.Color(visualLayer.lightColor) }
      },
      vertexShader: cloudVertex,
      fragmentShader: cloudFragment
    })
  }

  private addGrassBase() {
    const group = this.makeParallaxGroup(0.42, 0.18)
    group.userData.baseY = 0.08 + TERRAIN_LIFT * 0.45
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {},
      vertexShader: grassBaseVertex,
      fragmentShader: grassBaseFragment
    })
    this.addCoverPlane(material, -2, group)
  }

  private addGrassField() {
    const count = window.innerWidth < 720 ? 2400 : 8600
    const grassHalfWidth = 13.2
    const base = new THREE.PlaneGeometry(0.08, 1, 1, 6)
    base.translate(0, 0.5, 0)

    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.attributes.position = base.attributes.position
    geometry.attributes.uv = base.attributes.uv

    const offsets = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const angles = new Float32Array(count)
    const phases = new Float32Array(count)
    const depths = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const palette = [
      new THREE.Color('#183d3c'),
      new THREE.Color('#35694c'),
      new THREE.Color('#6f7f3b'),
      new THREE.Color('#b6a85b'),
      new THREE.Color('#d4c26b')
    ]

    let placed = 0
    let attempts = 0
    while (placed < count && attempts < count * 22) {
      attempts += 1
      const x = THREE.MathUtils.randFloat(-grassHalfWidth, grassHalfWidth)
      const xNorm = (x + grassHalfWidth) / (grassHalfWidth * 2)
      const slopeTop =
        -1.62 -
        xNorm * 3.05 +
        Math.sin(xNorm * 4.8 + 0.45) * 0.24 +
        Math.sin(xNorm * 11.0 - 0.7) * 0.1 -
        THREE.MathUtils.smoothstep(xNorm, 0.58, 0.98) * 0.52
      const depth = Math.pow(Math.random(), 1.15) * 4.35
      const y = slopeTop - depth + THREE.MathUtils.randFloat(-0.12, 0.18)
      if (y < -7.25 || y > -1.15) continue

      const clumpA = 0.5 + 0.5 * Math.sin(x * 1.25 + Math.sin(x * 0.37) * 2.1)
      const clumpB = 0.5 + 0.5 * Math.sin(x * 2.9 + y * 1.4)
      const depth01 = THREE.MathUtils.clamp(depth / 4.35, 0, 1)
      const nearSlope = 1 - THREE.MathUtils.clamp(depth / 2.85, 0, 1)
      const lowerForeground = THREE.MathUtils.clamp((slopeTop - y) / 4.05, 0, 1)
      const crestBand = 1 - THREE.MathUtils.smoothstep(depth01, 0.18, 0.78)
      const leftEdgeClump = 1 - THREE.MathUtils.smoothstep(xNorm, 0.02, 0.22)
      const rightEdgeClump = THREE.MathUtils.smoothstep(xNorm, 0.78, 0.98)
      const density =
        0.28 +
        clumpA * 0.42 +
        clumpB * 0.24 +
        nearSlope * 0.16 +
        lowerForeground * 0.18 +
        crestBand * 0.2 +
        leftEdgeClump * 0.32 +
        rightEdgeClump * 0.22
      if (Math.random() > density) continue

      const z = 10.5 + lowerForeground * 3.8 + Math.random() * 2.6
      const i = placed
      offsets.set([x, y, z], i * 3)
      scales[i] =
        THREE.MathUtils.randFloat(0.16, 1.55) *
        (0.42 + depth01 * 1.18 + nearSlope * 0.12)
      angles[i] = THREE.MathUtils.randFloat(-0.46, 0.42) + (xNorm - 0.5) * 0.22
      phases[i] = Math.random() * Math.PI * 2
      depths[i] = depth01
      const color = palette[Math.floor(Math.random() * palette.length)].clone()
      color.offsetHSL(
        THREE.MathUtils.randFloat(-0.035, 0.035),
        0,
        THREE.MathUtils.randFloat(-0.07, 0.1) + nearSlope * 0.04
      )
      colors.set([color.r, color.g, color.b], i * 3)
      placed += 1
    }

    geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1))
    geometry.setAttribute('instanceAngle', new THREE.InstancedBufferAttribute(angles, 1))
    geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1))
    geometry.setAttribute('instanceDepth', new THREE.InstancedBufferAttribute(depths, 1))
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geometry.instanceCount = placed

    this.grassMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: reduceMotion ? 0.08 : 0.68 },
        uPointer: { value: this.pointer },
        uPointerWorld: { value: this.pointerWorld },
        uRippleTime: { value: this.rippleTime },
        uRippleOrigin: { value: this.rippleOrigin }
      },
      vertexShader: grassVertex,
      fragmentShader: grassFragment
    })

    const mesh = new THREE.Mesh(geometry, this.grassMaterial)
    mesh.frustumCulled = false
    const group = this.makeParallaxGroup(0.52, 0.22)
    group.userData.baseY = 0.35 + TERRAIN_LIFT
    group.add(mesh)
    this.addForegroundGrass()
  }

  private addForegroundGrass() {
    const count = window.innerWidth < 720 ? 420 : 920
    const base = new THREE.PlaneGeometry(0.1, 1, 1, 7)
    base.translate(0, 0.5, 0)

    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.attributes.position = base.attributes.position
    geometry.attributes.uv = base.attributes.uv

    const offsets = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const angles = new Float32Array(count)
    const phases = new Float32Array(count)
    const depths = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const palette = [
      new THREE.Color('#173735'),
      new THREE.Color('#285849'),
      new THREE.Color('#527044'),
      new THREE.Color('#a69b4e'),
      new THREE.Color('#d7bf62')
    ]

    let placed = 0
    let attempts = 0
    while (placed < count && attempts < count * 16) {
      attempts += 1
      const x = THREE.MathUtils.randFloat(-12.6, 12.6)
      const xNorm = (x + 12.6) / 25.2
      const crestY =
        -1.72 -
        xNorm * 3.25 +
        Math.sin(xNorm * 4.8 + 0.45) * 0.22 -
        THREE.MathUtils.smoothstep(xNorm, 0.58, 0.98) * 0.5
      const depthFromCrest = THREE.MathUtils.randFloat(2.35, 5.35)
      const y = crestY - depthFromCrest + THREE.MathUtils.randFloat(-0.16, 0.16)
      if (y < -7.2 || y > -3.35) continue
      const depth = THREE.MathUtils.randFloat(0.72, 1.0)
      const i = placed
      offsets.set([x, y, 15 + Math.random() * 2.8], i * 3)
      scales[i] =
        THREE.MathUtils.randFloat(0.9, 2.35) *
        (0.9 + depth * 0.32) *
        THREE.MathUtils.lerp(1.12, 0.72, xNorm)
      angles[i] = THREE.MathUtils.randFloat(-0.62, 0.5) + (xNorm - 0.5) * 0.18
      phases[i] = Math.random() * Math.PI * 2
      depths[i] = depth
      const color = palette[Math.floor(Math.random() * palette.length)].clone()
      color.offsetHSL(THREE.MathUtils.randFloat(-0.035, 0.03), 0, THREE.MathUtils.randFloat(-0.08, 0.08))
      colors.set([color.r, color.g, color.b], i * 3)
      placed += 1
    }

    geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1))
    geometry.setAttribute('instanceAngle', new THREE.InstancedBufferAttribute(angles, 1))
    geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1))
    geometry.setAttribute('instanceDepth', new THREE.InstancedBufferAttribute(depths, 1))
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geometry.instanceCount = placed

    const sourceMaterial = this.grassMaterial
    if (!sourceMaterial) return
    const material = sourceMaterial.clone()
    material.uniforms = THREE.UniformsUtils.clone(sourceMaterial.uniforms)
    material.uniforms.uPointer.value = this.pointer
    material.uniforms.uPointerWorld.value = this.pointerWorld
    material.uniforms.uRippleOrigin.value = this.rippleOrigin
    this.shaderMaterials.push(material)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    const group = this.makeParallaxGroup(0.66, 0.28)
    group.userData.baseY = 0.18 + TERRAIN_LIFT
    group.add(mesh)
  }

  private addPostProcessing() {
    this.watercolorShaderPass = new ShaderPass(watercolorPass)
    this.watercolorShaderPass.uniforms.uStrength.value = reduceMotion ? 0.35 : 1
    this.composer.addPass(this.watercolorShaderPass)
  }

  private bindEvents() {
    const scheduleResize = () => this.scheduleResize()
    window.addEventListener('resize', scheduleResize)
    window.visualViewport?.addEventListener('resize', scheduleResize)
    window.visualViewport?.addEventListener('scroll', scheduleResize)
    this.resizeObserver = new ResizeObserver(scheduleResize)
    this.resizeObserver.observe(document.documentElement)
    this.resizeObserver.observe(document.body)

    window.addEventListener('pointermove', (event) => {
      const { width, height } = this.getViewportSize()
      this.pointerTarget.x = (event.clientX / width - 0.5) * 2
      this.pointerTarget.y = -(event.clientY / height - 0.5) * 2
      this.pointerWorldTarget.copy(this.screenToWorld(event.clientX, event.clientY))
    })

    window.addEventListener('pointerdown', (event) => {
      const world = this.screenToWorld(event.clientX, event.clientY)
      this.rippleOrigin.copy(world)
      this.pointerWorldTarget.copy(world)
      this.rippleTime = this.clock.elapsedTime
      for (const material of this.shaderMaterials) {
        if (!material.uniforms.uRippleOrigin || !material.uniforms.uRippleTime) continue
        material.uniforms.uRippleOrigin.value = this.rippleOrigin
        material.uniforms.uRippleTime.value = this.rippleTime
      }
    })

    window.addEventListener(
      'wheel',
      (event) => {
        this.targetSunProgress = THREE.MathUtils.clamp(
          this.targetSunProgress + Math.sign(event.deltaY) * -0.045,
          0.12,
          1
        )
      },
      { passive: true }
    )

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden
      if (this.isVisible) {
        this.clock.getDelta()
      }
    })

    window.addEventListener('deviceorientation', (event) => {
      if (!event.gamma || !event.beta) return
      this.pointerTarget.x = THREE.MathUtils.clamp(event.gamma / 28, -1, 1)
      this.pointerTarget.y = THREE.MathUtils.clamp((event.beta - 45) / -40, -1, 1)
    })
  }

  private screenToWorld(clientX: number, clientY: number) {
    const { width, height } = this.getViewportSize()
    const x = (clientX / width - 0.5) * this.viewWidth
    const y = -(clientY / height - 0.5) * this.viewHeight
    return new THREE.Vector2(x, y)
  }

  private getViewportSize() {
    const visualViewport = window.visualViewport
    const width = Math.max(
      1,
      Math.ceil(Math.max(window.innerWidth, document.documentElement.clientWidth, visualViewport?.width ?? 0))
    )
    const height = Math.max(
      1,
      Math.ceil(Math.max(window.innerHeight, document.documentElement.clientHeight, visualViewport?.height ?? 0))
    )
    return { width, height }
  }

  private scheduleResize() {
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame)
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0
      this.resize()
    })
  }

  private resize() {
    const { width, height } = this.getViewportSize()
    const aspect = width / height
    this.viewWidth = VIEW_HEIGHT * aspect
    this.viewHeight = VIEW_HEIGHT
    document.documentElement.style.setProperty('--app-width', `${width}px`)
    document.documentElement.style.setProperty('--app-height', `${height}px`)

    this.camera.left = -this.viewWidth / 2
    this.camera.right = this.viewWidth / 2
    this.camera.top = this.viewHeight / 2
    this.camera.bottom = -this.viewHeight / 2
    this.camera.updateProjectionMatrix()

    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)

    for (const mesh of this.coverPlanes) {
      mesh.scale.set(this.viewWidth * COVER_PLANE_OVERSCAN, this.viewHeight * COVER_PLANE_OVERSCAN, 1)
    }

    for (const material of this.shaderMaterials) {
      if (material.uniforms.uSun?.value instanceof THREE.Vector2) {
        const sunUniform = material.uniforms.uSun.value as THREE.Vector2
        const isMainSun = sunUniform.y > 0.63
        sunUniform.x = aspect < 0.75 ? 0.63 : isMainSun ? 0.79 : 0.76
      }
      if (material.uniforms.uAspect) {
        material.uniforms.uAspect.value = aspect
      }
    }

  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    if (!this.isVisible) return

    const delta = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.elapsedTime
    const speed = reduceMotion ? 0.18 : 1

    this.pointer.lerp(this.pointerTarget, reduceMotion ? 0.04 : 0.075)
    this.pointerWorld.lerp(this.pointerWorldTarget, reduceMotion ? 0.08 : 0.16)
    this.sunProgress = THREE.MathUtils.lerp(this.sunProgress, this.targetSunProgress, delta * 1.4)

    for (const material of this.shaderMaterials) {
      if (material.uniforms.uTime) material.uniforms.uTime.value = time * speed
      if (material.uniforms.uSunProgress) material.uniforms.uSunProgress.value = this.sunProgress
    }

    if (this.grassMaterial) {
      const gust =
        0.38 +
        Math.sin(time * 0.42) * 0.16 +
        Math.sin(time * 1.72) * 0.08 +
        THREE.MathUtils.clamp(Math.abs(this.pointer.x) * 0.22, 0, 0.22)
      for (const material of this.shaderMaterials) {
        if (!material.uniforms.uWindStrength) continue
        material.uniforms.uTime.value = time * speed
        material.uniforms.uWindStrength.value = reduceMotion ? 0.08 : gust
        material.uniforms.uPointer.value = this.pointer
        material.uniforms.uPointerWorld.value = this.pointerWorld
      }
    }

    if (this.watercolorShaderPass) {
      this.watercolorShaderPass.uniforms.uTime.value = time * speed
    }

    this.updateParallax()
    this.composer.render()
  }

  private updateParallax() {
    const sunriseLift = (this.sunProgress - 0.58) * 0.18
    for (const group of this.parallaxGroups) {
      group.position.x = group.userData.baseX + this.pointer.x * group.userData.parallaxX
      group.position.y = group.userData.baseY + this.pointer.y * group.userData.parallaxY + sunriseLift * group.userData.parallaxY
    }
  }

}

const canvas = document.querySelector<HTMLCanvasElement>('#scene')

if (!canvas) {
  throw new Error('Scene canvas not found')
}

const app = new WatercolorSunriseScene(canvas)
app.init().catch((error) => {
  console.error(error)
})
