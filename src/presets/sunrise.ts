import { watercolorCloudLayerConfigs } from '../cloudLayers.ts'
import type { ScenePreset } from './types.ts'

export const sunriseCloudVisualLayers = [
  {
    layer: watercolorCloudLayerConfigs[0],
    z: -82,
    baseX: -0.14,
    baseY: -0.1,
    parallaxX: 0.12,
    parallaxY: 0.07,
    bandCenter: 0.31,
    bandThickness: 0.26,
    bandFeather: 0.18,
    opacity: 0.92,
    scale: [2.35, 5.35],
    drift: [0.28, -0.02],
    shadowStrength: 0.66,
    billowDepth: 0.42,
    rollStrength: 0.34,
    horizonWeight: 0.92,
    highLayer: false,
    shadowColor: '#91abd2',
    midColor: '#edf6ff',
    lightColor: '#fff1b8'
  },
  {
    layer: watercolorCloudLayerConfigs[1],
    z: -78,
    baseX: 0.22,
    baseY: 0.04,
    parallaxX: 0.16,
    parallaxY: 0.085,
    bandCenter: 0.38,
    bandThickness: 0.28,
    bandFeather: 0.2,
    opacity: 0.78,
    scale: [3.1, 6.45],
    drift: [-0.2, 0.018],
    shadowStrength: 0.58,
    billowDepth: 0.36,
    rollStrength: 0.28,
    horizonWeight: 0.84,
    highLayer: false,
    shadowColor: '#9bb8dd',
    midColor: '#f7fbff',
    lightColor: '#ffecb6'
  },
  {
    layer: watercolorCloudLayerConfigs[2],
    z: -74,
    baseX: -0.08,
    baseY: 0.16,
    parallaxX: 0.1,
    parallaxY: 0.055,
    bandCenter: 0.5,
    bandThickness: 0.2,
    bandFeather: 0.2,
    opacity: 0.42,
    scale: [4.2, 8.1],
    drift: [0.12, 0.018],
    shadowStrength: 0.34,
    billowDepth: 0.24,
    rollStrength: 0.18,
    horizonWeight: 0.54,
    highLayer: false,
    shadowColor: '#c7ddf3',
    midColor: '#f9fbff',
    lightColor: '#ffedbd'
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
    billowDepth: 0.08,
    rollStrength: 0.06,
    horizonWeight: 0.16,
    highLayer: true,
    shadowColor: '#9bc6f2',
    midColor: '#e8f6ff',
    lightColor: '#fff8db'
  }
] as const

export const sunrisePreset = {
  id: 'sunrise',
  metadata: {
    title: '水彩日出',
    mainAriaLabel: '水彩风格草地和云海动态场景',
    canvasAriaLabel: '水彩云海和斜面山坡草地的动态场景'
  },
  clearColor: '#d1edfc',
  cssBackground:
    'radial-gradient(circle at 78% 30%, rgba(255, 225, 137, 0.52), transparent 28%), linear-gradient(180deg, #d1edfc 0%, #ffdf9c 42%, #93a878 100%)',
  initialSunProgress: 0.58,
  wheelControlsSunProgress: true,
  sky: {
    topColor: '#6eaee6',
    upperColor: '#d1edfc',
    horizonColor: '#ffc76d',
    warmColor: '#fff0cf',
    warmStrength: 0.22
  },
  cloudVisualLayers: sunriseCloudVisualLayers,
  grass: {
    bladeHighlightColor: '#ffd157',
    rootShadowColor: '#142e26',
    baseDeepColor: '#0f2e29',
    baseGreenColor: '#42663a',
    baseGoldColor: '#dbc057',
    baseGlowColor: '#ffd16f',
    midPalette: ['#183d3c', '#35694c', '#6f7f3b', '#b6a85b', '#d4c26b'],
    distantPalette: ['#2f5445', '#506844', '#7d844d', '#b3a960'],
    foregroundPalette: ['#173735', '#285849', '#527044', '#a69b4e', '#d7bf62']
  },
  sunRays: {
    enabled: true
  },
  watercolorStrength: 1
} as const satisfies ScenePreset
