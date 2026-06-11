import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')

test('scene uses the planned medium grass-depth viewport and distant grass layer', () => {
  assert.match(source, /const VIEW_HEIGHT = 13\.25/)
  assert.match(source, /Math\.pow\(Math\.random\(\), 1\.15\) \* 5\.15/)
  assert.match(source, /if \(y < -7\.95 \|\| y > -1\.15\) continue/)
  assert.match(source, /const depth01 = THREE\.MathUtils\.clamp\(depth \/ 5\.15, 0, 1\)/)
  assert.match(source, /const nearSlope = 1 - THREE\.MathUtils\.clamp\(depth \/ 3\.35, 0, 1\)/)
  assert.match(source, /const lowerForeground = THREE\.MathUtils\.clamp\(\(slopeTop - y\) \/ 4\.85, 0, 1\)/)
  assert.match(source, /const z = 10\.0 \+ lowerForeground \* 4\.4 \+ Math\.random\(\) \* 2\.8/)
  assert.match(source, /private cloneGrassMaterial\(\)/)
  assert.match(source, /private addDistantGrass\(\)/)
  assert.match(source, /const count = window\.innerWidth < 720 \? 560 : 1700/)
  assert.match(source, /new THREE\.PlaneGeometry\(0\.055, 1, 1, 5\)/)
  assert.match(source, /THREE\.MathUtils\.randFloat\(-14\.4, 14\.4\)/)
  assert.match(source, /this\.makeParallaxGroup\(0\.34, 0\.14, 0\.04\)/)
  assert.match(source, /group\.userData\.baseY = 0\.44 \+ TERRAIN_LIFT/)
})

test('grass rendering includes a grounded slope and root contact shadow', () => {
  assert.match(source, /float rootGrip = smoothstep\(0\.22, 0\.0, vHeight\)/)
  assert.match(source, /float rootInk = rootGrip \* taper \* mix\(0\.1, 0\.18, vDepth\)/)
  assert.match(source, /float contactShadow = smoothstep\(crest \+ 0\.13, crest - 0\.08, uv\.y\)/)
  assert.match(source, /float rootShelf = smoothstep\(crest \+ 0\.02, crest - 0\.16, uv\.y\)/)
  assert.match(source, /float alpha = field \* lowerHold \* topFade \* mix\(0\.76, 0\.92, rootShelf\)/)
})

test('foreground grass reserves dense corner fill so edges do not expose the base layer', () => {
  assert.match(source, /const cornerFillCount = window\.innerWidth < 720 \? 96 : 220/)
  assert.match(source, /const cornerFill = placed < cornerFillCount/)
  assert.match(source, /THREE\.MathUtils\.randFloat\(-13\.8, -8\.8\)/)
  assert.match(source, /THREE\.MathUtils\.randFloat\(8\.8, 13\.8\)/)
  assert.match(source, /if \(!cornerFill && !cameraFill && \(y < -7\.2 \|\| y > -3\.35\)\) continue/)
  assert.match(source, /if \(!cornerFill && !cameraFill && Math\.random\(\) > density\) continue/)
})

test('foreground grass grows a near-camera apron below the viewport bottom', () => {
  assert.match(source, /const cameraFillCount = window\.innerWidth < 720 \? 140 : 320/)
  assert.match(source, /const cameraFill = placed >= cornerFillCount && placed < cornerFillCount \+ cameraFillCount/)
  assert.match(source, /THREE\.MathUtils\.randFloat\(-14\.2, 14\.2\)/)
  assert.match(source, /THREE\.MathUtils\.randFloat\(-8\.35, -6\.45\)/)
  assert.match(source, /\(cameraFill \? 19\.4 : cornerFill \? 16\.2 : 15\) \+ Math\.random\(\) \* \(cameraFill \? 4\.6 : 2\.8\)/)
  assert.match(source, /THREE\.MathUtils\.randFloat\(cameraFill \? 1\.55 : cornerFill \? 1\.15 : 0\.9, cameraFill \? 3\.35 : cornerFill \? 2\.7 : 2\.35\)/)
  assert.match(source, /if \(!cornerFill && !cameraFill && Math\.random\(\) > density\) continue/)
})

test('grass parallax clamps upward lift so fast pointer movement cannot expose the bottom edge', () => {
  assert.match(source, /maxLift: number/)
  assert.match(source, /private makeParallaxGroup\(parallaxX: number, parallaxY: number, maxLift = Infinity\)/)
  assert.match(source, /const pointerLift = this\.pointer\.y \* group\.userData\.parallaxY/)
  assert.match(source, /const clampedLift = pointerLift > 0 \? Math\.min\(pointerLift, group\.userData\.maxLift\) : pointerLift/)
  assert.match(source, /this\.makeParallaxGroup\(0\.42, 0\.18, 0\.035\)/)
  assert.match(source, /this\.makeParallaxGroup\(0\.52, 0\.22, 0\.045\)/)
  assert.match(source, /this\.makeParallaxGroup\(0\.34, 0\.14, 0\.04\)/)
  assert.match(source, /this\.makeParallaxGroup\(0\.66, 0\.28, 0\.045\)/)
})
