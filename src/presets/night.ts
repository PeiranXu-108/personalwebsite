import { sunriseCloudVisualLayers } from './sunrise.ts'
import type { ScenePreset } from './types.ts'

export const nightCloudVisualLayers = sunriseCloudVisualLayers.map((layer, index) => ({
  ...layer,
  opacity: [0.64, 0.58, 0.38, 0.5][index] ?? layer.opacity,
  shadowStrength: [0.5, 0.44, 0.28, 0.2][index] ?? layer.shadowStrength,
  shadowColor: ['#344a79', '#405b8a', '#536f9c', '#647fb0'][index] ?? layer.shadowColor,
  midColor: ['#9fb4dd', '#b6c8e8', '#c5d5ee', '#d6e1f4'][index] ?? layer.midColor,
  lightColor: ['#eef6ff', '#f4f8ff', '#f7fbff', '#fbfdff'][index] ?? layer.lightColor
}))

export const nightPreset = {
  id: 'night',
  metadata: {
    title: '水彩月夜',
    mainAriaLabel: '水彩风格月夜草地、云海和星空动态场景',
    canvasAriaLabel: '水彩月夜云海、斜面草地、星空和萤火虫动态场景'
  },
  clearColor: '#101b3e',
  cssBackground:
    'radial-gradient(circle at 77% 24%, rgba(199, 219, 255, 0.38), transparent 24%), linear-gradient(180deg, #101b3e 0%, #273a68 48%, #12271f 100%)',
  initialSunProgress: 0.22,
  wheelControlsSunProgress: false,
  sky: {
    topColor: '#101b3e',
    upperColor: '#243762',
    horizonColor: '#8da6d6',
    warmColor: '#cfe0ff',
    warmStrength: 0.08
  },
  cloudVisualLayers: nightCloudVisualLayers,
  grass: {
    bladeHighlightColor: '#b7d7ff',
    rootShadowColor: '#07131b',
    baseDeepColor: '#07161a',
    baseGreenColor: '#193b37',
    baseGoldColor: '#507a6a',
    baseGlowColor: '#b9d9ff',
    midPalette: ['#102c33', '#1f4c4a', '#3f665b', '#6c8b78', '#a8c7a7'],
    distantPalette: ['#1c3d45', '#314d59', '#58707a', '#8fa9b9'],
    foregroundPalette: ['#0b2428', '#18413f', '#315b4f', '#6e8f73', '#b5d5a0']
  },
  sunRays: {
    enabled: false
  },
  celestial: {
    moon: {
      enabled: true,
      center: [0.78, 0.76],
      radius: 0.056,
      haloRadius: 0.32,
      color: '#f6fbff',
      haloColor: '#b9d5ff',
      opacity: 0.96
    },
    stars: {
      enabled: true,
      density: 0.82,
      opacity: 0.8,
      twinkleStrength: 0.36
    },
    fireflies: {
      enabled: true,
      mobileCount: 82,
      desktopCount: 170,
      color: '#fff2a6',
      glowColor: '#ffd76a',
      opacity: 0.92
    }
  },
  watercolorStrength: 0.82
} as const satisfies ScenePreset
