import test from 'node:test'
import assert from 'node:assert/strict'

import { watercolorCloudLayerConfigs, watercolorCloudLayers } from '../src/cloudLayers.ts'

test('watercolor cloud layer config uses the Takram four-layer cloud model', () => {
  assert.equal(watercolorCloudLayers.length, 4)
  assert.equal(new Set(watercolorCloudLayerConfigs.map(layer => layer.channel)).size, 4)

  const denseLowLayers = watercolorCloudLayerConfigs.filter(
    layer =>
      layer.altitude <= 1200 &&
      layer.height >= 600 &&
      layer.densityScale >= 0.12
  )
  const thinHighLayers = watercolorCloudLayerConfigs.filter(
    layer =>
      layer.altitude >= 6000 &&
      layer.height <= 700 &&
      layer.densityScale <= 0.015
  )

  assert.ok(denseLowLayers.length >= 2)
  assert.ok(thinHighLayers.length >= 1)
})
