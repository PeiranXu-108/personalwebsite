import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const stylesSource = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')

test('canvas keeps the default pointer while the soft cursor floats above it', () => {
  assert.doesNotMatch(stylesSource, /cursor:\s*crosshair/)
  assert.match(stylesSource, /canvas\s*{[\s\S]*cursor:\s*default;/)
  assert.match(stylesSource, /\.soft-cursor\s*{[\s\S]*width:\s*16px;[\s\S]*height:\s*16px;/)
  assert.match(stylesSource, /\.soft-cursor\s*{[\s\S]*pointer-events:\s*none;/)
  assert.match(stylesSource, /\.soft-cursor\.is-visible\s*{[\s\S]*opacity:\s*1;/)
})

test('soft cursor follows pointer movement with eased catch-up', () => {
  assert.match(mainSource, /function setupSoftCursor\(\)/)
  assert.match(mainSource, /document\.body\.append\(softCursor\)/)
  assert.match(mainSource, /softCursor\.style\.opacity = '1'/)
  assert.match(mainSource, /softCursor\.style\.opacity = '0'/)
  assert.match(mainSource, /currentX \+= \(targetX - currentX\) \* followEase/)
  assert.match(mainSource, /currentY \+= \(targetY - currentY\) \* followEase/)
  assert.match(mainSource, /window\.setTimeout\(renderSoftCursor, 16\)/)
  assert.match(mainSource, /window\.addEventListener\('pointerout', hideWhenLeavingWindow/)
  assert.match(mainSource, /scheduleSoftCursorFrame\(\)/)
})
