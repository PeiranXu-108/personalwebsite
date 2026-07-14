import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sceneSource = readFileSync(new URL('../src/core/WatercolorScene.ts', import.meta.url), 'utf8')
const volumeSource = readFileSync(new URL('../src/layers/volumetricClouds.ts', import.meta.url), 'utf8')

test('sunrise uses the dedicated ray-marched cloud volume', () => {
  assert.match(sceneSource, /createVolumetricCloudMaterial/)
  assert.match(sceneSource, /if \(this\.preset\.id === 'sunrise'\)/)
  assert.match(volumeSource, /vec3 rayOrigin/)
  assert.match(volumeSource, /vec3 rayDirection/)
  assert.match(volumeSource, /for \(int stepIndex = 0; stepIndex < 32; stepIndex\+\+\)/)
  assert.match(volumeSource, /float opticalDepth/)
  assert.match(volumeSource, /volume\.a > 0\.96/)
  assert.match(volumeSource, /uMotionScale/)
  assert.match(volumeSource, /float softBody = smoothstep/)
  assert.match(volumeSource, /float grazingFade = smoothstep/)
  assert.match(volumeSource, /travel \+= stepLength/)
  assert.match(volumeSource, /float flowTime = uTime \* uMotionScale/)
  assert.match(volumeSource, /vec3 counterFlow = vec3/)
  assert.match(volumeSource, /float verticalRoll = 0\.5 \+ 0\.5 \* sin/)
  assert.match(volumeSource, /rolledHeight/)
})

test('sunrise camera reveals more of the cloud sea without changing the scene elements', () => {
  assert.match(sceneSource, /const SUNRISE_CAMERA_Y = 0\.46/)
  assert.match(sceneSource, /const SUNRISE_CAMERA_ZOOM = 0\.92/)
  assert.match(sceneSource, /this\.camera\.zoom = isSunrise \? SUNRISE_CAMERA_ZOOM : 1/)
  assert.match(sceneSource, /const visibleHeight = this\.viewHeight \/ this\.camera\.zoom/)
  assert.match(sceneSource, /this\.preset\.id === 'sunrise' \? 0\.66/)
  assert.match(sceneSource, /private qaFreeze = new URLSearchParams/)
  assert.match(sceneSource, /if \(!this\.qaFreeze\) requestAnimationFrame\(this\.animate\)/)
})
