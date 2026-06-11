import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getScenePreset,
  resolveSceneId,
  scenePresets,
  type SceneId
} from '../src/presets/sceneRegistry.ts'

test('scene registry resolves sunrise by default', () => {
  assert.equal(resolveSceneId(new URLSearchParams()), 'sunrise')
  assert.equal(getScenePreset(new URLSearchParams()).id, 'sunrise')
})

test('scene registry resolves explicit sunrise and night scenes', () => {
  assert.equal(resolveSceneId(new URLSearchParams('scene=sunrise')), 'sunrise')
  assert.equal(resolveSceneId(new URLSearchParams('scene=night')), 'night')
})

test('scene registry falls back to sunrise for unknown scene values', () => {
  assert.equal(resolveSceneId(new URLSearchParams('scene=storm')), 'sunrise')
  assert.equal(resolveSceneId(new URLSearchParams('scene=')), 'sunrise')
})

test('scene registry exposes sunrise and night presets', () => {
  const ids = scenePresets.map((preset) => preset.id satisfies SceneId)
  assert.deepEqual(ids, ['sunrise', 'night'])
  assert.equal(scenePresets[0].metadata.title, '水彩日出')
  assert.equal(scenePresets[1].metadata.title, '水彩月夜')
})
