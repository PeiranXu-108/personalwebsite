import type { CloudVisualLayer } from '../layers/clouds.ts'

export type SceneId = 'sunrise' | 'night'

export type SceneMetadata = {
  title: string
  mainAriaLabel: string
  canvasAriaLabel: string
}

export type ScenePreset = {
  id: SceneId
  metadata: SceneMetadata
  clearColor: string
  cssBackground: string
  initialSunProgress: number
  wheelControlsSunProgress: boolean
  sky: SkyPreset
  cloudVisualLayers: readonly CloudVisualLayer[]
  grass: GrassPreset
  sunRays?: SunRaysPreset
  celestial?: CelestialPreset
  watercolorStrength: number
}

export type SkyPreset = {
  topColor: string
  upperColor: string
  horizonColor: string
  warmColor: string
  warmStrength: number
}

export type SunRaysPreset = {
  enabled: boolean
}

export type GrassPreset = {
  bladeHighlightColor: string
  rootShadowColor: string
  baseDeepColor: string
  baseGreenColor: string
  baseGoldColor: string
  baseGlowColor: string
  midPalette: readonly string[]
  distantPalette: readonly string[]
  foregroundPalette: readonly string[]
}

export type CelestialPreset = {
  moon: MoonPreset
  stars: StarPreset
  fireflies: FireflyPreset
}

export type MoonPreset = {
  enabled: boolean
  center: readonly [number, number]
  radius: number
  haloRadius: number
  color: string
  haloColor: string
  opacity: number
}

export type StarPreset = {
  enabled: boolean
  density: number
  opacity: number
  twinkleStrength: number
}

export type FireflyPreset = {
  enabled: boolean
  mobileCount: number
  desktopCount: number
  color: string
  glowColor: string
  opacity: number
}
