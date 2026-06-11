import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sceneSource = readFileSync(new URL('../src/core/WatercolorScene.ts', import.meta.url), 'utf8')
const grassSource = readFileSync(new URL('../src/layers/grass.ts', import.meta.url), 'utf8')

test('scene uses the planned medium grass-depth viewport and distant grass layer', () => {
  assert.match(sceneSource, /const VIEW_HEIGHT = 13\.25/)
  assert.match(sceneSource, /Math\.pow\(Math\.random\(\), 1\.15\) \* 5\.15/)
  assert.match(sceneSource, /if \(y < -7\.95 \|\| y > -1\.15\) continue/)
  assert.match(sceneSource, /const depth01 = THREE\.MathUtils\.clamp\(depth \/ 5\.15, 0, 1\)/)
  assert.match(sceneSource, /const nearSlope = 1 - THREE\.MathUtils\.clamp\(depth \/ 3\.35, 0, 1\)/)
  assert.match(sceneSource, /const lowerForeground = THREE\.MathUtils\.clamp\(\(slopeTop - y\) \/ 4\.85, 0, 1\)/)
  assert.match(sceneSource, /const z = 10\.0 \+ lowerForeground \* 4\.4 \+ Math\.random\(\) \* 2\.8/)
  assert.match(sceneSource, /private cloneGrassMaterial\(\)/)
  assert.match(sceneSource, /private addDistantGrass\(\)/)
  assert.match(sceneSource, /const count = window\.innerWidth < 720 \? 560 : 1700/)
  assert.match(sceneSource, /new THREE\.PlaneGeometry\(0\.055, 1, 1, 5\)/)
  assert.match(sceneSource, /THREE\.MathUtils\.randFloat\(-14\.4, 14\.4\)/)
  assert.match(sceneSource, /this\.makeParallaxGroup\(0\.34, 0\.14, 0\.04\)/)
  assert.match(sceneSource, /group\.userData\.baseY = 0\.44 \+ TERRAIN_LIFT/)
})

test('grass rendering includes a grounded slope and root contact shadow', () => {
  assert.match(grassSource, /float rootGrip = smoothstep\(0\.22, 0\.0, vHeight\)/)
  assert.match(grassSource, /float rootInk = rootGrip \* taper \* mix\(0\.1, 0\.18, vDepth\)/)
  assert.match(grassSource, /float contactShadow = smoothstep\(crest \+ 0\.13, crest - 0\.08, uv\.y\)/)
  assert.match(grassSource, /float rootShelf = smoothstep\(crest \+ 0\.02, crest - 0\.16, uv\.y\)/)
  assert.match(grassSource, /float alpha = field \* lowerHold \* topFade \* mix\(0\.76, 0\.92, rootShelf\)/)
})

test('foreground grass reserves dense corner fill so edges do not expose the base layer', () => {
  assert.match(sceneSource, /const cornerFillCount = window\.innerWidth < 720 \? 96 : 220/)
  assert.match(sceneSource, /const cornerFill = placed < cornerFillCount/)
  assert.match(sceneSource, /THREE\.MathUtils\.randFloat\(-13\.8, -8\.8\)/)
  assert.match(sceneSource, /THREE\.MathUtils\.randFloat\(8\.8, 13\.8\)/)
  assert.match(sceneSource, /if \(!cornerFill && !cameraFill && \(y < -7\.2 \|\| y > -3\.35\)\) continue/)
  assert.match(sceneSource, /if \(!cornerFill && !cameraFill && Math\.random\(\) > density\) continue/)
})

test('foreground grass grows a near-camera apron below the viewport bottom', () => {
  assert.match(sceneSource, /const cameraFillCount = window\.innerWidth < 720 \? 140 : 320/)
  assert.match(sceneSource, /const cameraFill = placed >= cornerFillCount && placed < cornerFillCount \+ cameraFillCount/)
  assert.match(sceneSource, /THREE\.MathUtils\.randFloat\(-14\.2, 14\.2\)/)
  assert.match(sceneSource, /THREE\.MathUtils\.randFloat\(-8\.35, -6\.45\)/)
  assert.match(sceneSource, /\(cameraFill \? 19\.4 : cornerFill \? 16\.2 : 15\) \+ Math\.random\(\) \* \(cameraFill \? 4\.6 : 2\.8\)/)
  assert.match(sceneSource, /THREE\.MathUtils\.randFloat\(cameraFill \? 1\.55 : cornerFill \? 1\.15 : 0\.9, cameraFill \? 3\.35 : cornerFill \? 2\.7 : 2\.35\)/)
  assert.match(sceneSource, /if \(!cornerFill && !cameraFill && Math\.random\(\) > density\) continue/)
})

test('grass parallax clamps upward lift so fast pointer movement cannot expose the bottom edge', () => {
  assert.match(sceneSource, /maxLift: number/)
  assert.match(sceneSource, /private makeParallaxGroup\(parallaxX: number, parallaxY: number, maxLift = Infinity\)/)
  assert.match(sceneSource, /const pointerLift = this\.pointer\.y \* group\.userData\.parallaxY/)
  assert.match(sceneSource, /const clampedLift = pointerLift > 0 \? Math\.min\(pointerLift, group\.userData\.maxLift\) : pointerLift/)
  assert.match(sceneSource, /this\.makeParallaxGroup\(0\.42, 0\.18, 0\.035\)/)
  assert.match(sceneSource, /this\.makeParallaxGroup\(0\.52, 0\.22, 0\.045\)/)
  assert.match(sceneSource, /this\.makeParallaxGroup\(0\.34, 0\.14, 0\.04\)/)
  assert.match(sceneSource, /this\.makeParallaxGroup\(0\.66, 0\.28, 0\.045\)/)
})
