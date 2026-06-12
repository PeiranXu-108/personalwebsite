import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const celestialSource = readFileSync(new URL('../src/layers/celestial.ts', import.meta.url), 'utf8')
const sceneSource = readFileSync(new URL('../src/core/WatercolorScene.ts', import.meta.url), 'utf8')

test('celestial layer module defines moon, star, and firefly factories', () => {
  assert.match(celestialSource, /createMoonMaterial/)
  assert.match(celestialSource, /createStarsMaterial/)
  assert.match(celestialSource, /createFireflyField/)
  assert.match(celestialSource, /uMoonTex/)
  assert.match(celestialSource, /uHaloStrength/)
  assert.match(celestialSource, /uTwinkleStrength/)
  assert.match(celestialSource, /desktopCount/)
  assert.match(celestialSource, /uGrassLightColor/)
  assert.match(celestialSource, /uGrassLightOpacity/)
  assert.match(celestialSource, /uGrassLightScale/)
  assert.match(celestialSource, /grassLightMesh/)
  assert.match(celestialSource, /grassLightMaterial/)
})

test('moon shader samples the CDN moon texture only inside the disc', () => {
  assert.match(celestialSource, /moon_1024\.jpg/)
  assert.match(celestialSource, /new THREE\.TextureLoader\(\)/)
  assert.match(celestialSource, /colorSpace = THREE\.SRGBColorSpace/)
  assert.match(celestialSource, /minFilter = THREE\.LinearMipmapLinearFilter/)
  assert.match(celestialSource, /magFilter = THREE\.LinearFilter/)
  assert.match(celestialSource, /wrapS = THREE\.ClampToEdgeWrapping/)
  assert.match(celestialSource, /wrapT = THREE\.ClampToEdgeWrapping/)
  assert.match(celestialSource, /uniform sampler2D uMoonTex/)
  assert.match(celestialSource, /if \(r2 < 1\.0\)[\s\S]*texture2D\(uMoonTex/)
})

test('core scene mounts celestial layers before and after configurable cloud and grass layers', () => {
  assert.match(sceneSource, /private addCelestialBackdrop\(\)/)
  assert.match(sceneSource, /private addFireflies\(\)/)
  assert.match(sceneSource, /this\.addCelestialBackdrop\(\)/)
  assert.match(sceneSource, /this\.addCloudLayers\(\)/)
  assert.match(sceneSource, /this\.addFireflies\(\)/)
  assert.match(sceneSource, /group\.add\(grassLightMesh\)[\s\S]*group\.add\(mesh\)/)
  assert.match(sceneSource, /this\.shaderMaterials\.push\(grassLightMaterial\)/)
  assert.match(sceneSource, /this\.shaderMaterials\.push\(material\)/)
})
