import { CloudLayers, type CloudLayerLike, type TextureChannel } from '@takram/three-clouds'

export type WatercolorCloudLayerConfig = CloudLayerLike & {
  channel: TextureChannel
  altitude: number
  height: number
  densityScale: number
  shapeAmount: number
  shapeDetailAmount: number
  coverageFilterWidth: number
}

export const watercolorCloudLayerConfigs = [
  {
    channel: 'r',
    altitude: 420,
    height: 920,
    densityScale: 0.18,
    shapeAmount: 1,
    shapeDetailAmount: 0.86,
    weatherExponent: 0.82,
    shapeAlteringBias: 0.26,
    coverageFilterWidth: 0.42,
    shadow: true,
    densityProfile: { linearTerm: 0.88, constantTerm: 0.28 }
  },
  {
    channel: 'g',
    altitude: 980,
    height: 1240,
    densityScale: 0.2,
    shapeAmount: 0.92,
    shapeDetailAmount: 0.7,
    weatherExponent: 1.14,
    shapeAlteringBias: 0.34,
    coverageFilterWidth: 0.5,
    shadow: true,
    densityProfile: {
      expTerm: -0.08,
      exponent: 1.7,
      linearTerm: 0.72,
      constantTerm: 0.22
    }
  },
  {
    channel: 'b',
    altitude: 1300,
    height: 820,
    densityScale: 0.065,
    shapeAmount: 0.58,
    shapeDetailAmount: 0.34,
    weatherExponent: 1.35,
    shapeAlteringBias: 0.42,
    coverageFilterWidth: 0.56,
    shadow: false,
    densityProfile: { linearTerm: 0.48, constantTerm: 0.1 }
  },
  {
    channel: 'a',
    altitude: 7800,
    height: 460,
    densityScale: 0.0065,
    shapeAmount: 0.36,
    shapeDetailAmount: 0,
    weatherExponent: 1.4,
    shapeAlteringBias: 0.5,
    coverageFilterWidth: 0.64,
    shadow: false,
    densityProfile: { linearTerm: 0.2, constantTerm: 0.03 }
  }
] as const satisfies readonly WatercolorCloudLayerConfig[]

export const watercolorCloudLayers = new CloudLayers(watercolorCloudLayerConfigs)
