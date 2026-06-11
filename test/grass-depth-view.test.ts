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
  assert.match(source, /this\.makeParallaxGroup\(0\.34, 0\.14\)/)
  assert.match(source, /group\.userData\.baseY = 0\.44 \+ TERRAIN_LIFT/)
})
