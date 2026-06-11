import type { ScenePreset } from './types.ts'

export const nightCloudVisualLayers = [] as const

export const nightPreset = {
  id: 'night',
  metadata: {
    title: '水彩月夜',
    mainAriaLabel: '水彩风格月夜草地和星空动态场景',
    canvasAriaLabel: '水彩月夜斜面草地、星空和萤火虫动态场景'
  },
  clearColor: '#101b3e',
  cssBackground:
    'radial-gradient(circle at 77% 24%, rgba(199, 219, 255, 0.16), transparent 18%), linear-gradient(180deg, #101b3e 0%, #273a68 48%, #12271f 100%)',
  initialSunProgress: 0.22,
  wheelControlsSunProgress: false,
  sky: {
    topColor: '#101b3e',
    upperColor: '#1a2a50',
    horizonColor: '#5f78a8',
    warmColor: '#9fb9e8',
    warmStrength: 0.04
  },
  cloudVisualLayers: nightCloudVisualLayers,
  grass: {
    bladeHighlightColor: '#84a98d',
    rootShadowColor: '#03090d',
    baseDeepColor: '#030b10',
    baseGreenColor: '#0d2523',
    baseGoldColor: '#263f36',
    baseGlowColor: '#405f4c',
    midPalette: ['#07191d', '#12302f', '#23473e', '#3f6653', '#6f9574'],
    distantPalette: ['#0d2229', '#1b3036', '#33484d', '#61767d'],
    foregroundPalette: ['#061619', '#0e2a28', '#204236', '#496948', '#7fa06d']
  },
  sunRays: {
    enabled: false
  },
  celestial: {
    moon: {
      enabled: true,
      center: [0.78, 0.76],
      radius: 0.056,
      haloRadius: 0.24,
      haloStrength: 0.22,
      color: '#f6fbff',
      haloColor: '#8faee5',
      opacity: 0.94
    },
    stars: {
      enabled: true,
      density: 0.82,
      opacity: 0.8,
      twinkleStrength: 0.36
    },
    fireflies: {
      enabled: true,
      mobileCount: 88,
      desktopCount: 85,
      color: '#fff7b8',
      glowColor: '#ffc85f',
      grassLightColor: '#ffd16a',
      grassLightOpacity: 0.38,
      grassLightScale: 3.15,
      opacity: 1
    }
  },
  watercolorStrength: 0.82
} as const satisfies ScenePreset
