import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

import {
  createFireflyField,
  createMoonMaterial,
  createStarsMaterial
} from '../layers/celestial.ts'
import { createCloudMaterial as createLayerCloudMaterial } from '../layers/clouds.ts'
import {
  createGrassBaseMaterial,
  createGrassMaterial,
  makeColorPalette
} from '../layers/grass.ts'
import { createSkyMaterial } from '../layers/sky.ts'
import { createSunRaysMaterial } from '../layers/sunRays.ts'
import { watercolorPass } from '../postprocessing/watercolorPass.ts'
import type { ScenePreset } from '../presets/types.ts'

const VIEW_HEIGHT = 13.25
const TERRAIN_LIFT = 0.34
const COVER_PLANE_OVERSCAN = 1.12
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

type CoverPlane = THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.ShaderMaterial | THREE.MeshBasicMaterial
>

type LayerGroup = THREE.Group & {
  userData: {
    baseX: number
    baseY: number
    parallaxX: number
    parallaxY: number
    maxLift: number
  }
}

export class WatercolorScene {
  private scene = new THREE.Scene()
  private camera!: THREE.OrthographicCamera
  private renderer: THREE.WebGLRenderer
  private composer!: EffectComposer
  private clock = new THREE.Clock()
  private coverPlanes: CoverPlane[] = []
  private parallaxGroups: LayerGroup[] = []
  private shaderMaterials: THREE.ShaderMaterial[] = []
  private grassMaterial?: THREE.ShaderMaterial
  private watercolorShaderPass?: ShaderPass
  private viewWidth = VIEW_HEIGHT * window.innerWidth / window.innerHeight
  private viewHeight = VIEW_HEIGHT
  private pointer = new THREE.Vector2()
  private pointerTarget = new THREE.Vector2()
  private pointerWorld = new THREE.Vector2(0, -3.2)
  private pointerWorldTarget = new THREE.Vector2(0, -3.2)
  private rippleOrigin = new THREE.Vector2(0, -4.2)
  private rippleTime = -100
  private resizeFrame = 0
  private resizeObserver?: ResizeObserver
  private sunProgress: number
  private targetSunProgress: number
  private isVisible = true

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly preset: ScenePreset
  ) {
    this.sunProgress = preset.initialSunProgress
    this.targetSunProgress = preset.initialSunProgress
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setClearColor(new THREE.Color(preset.clearColor), 1)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, reduceMotion ? 1 : 1.2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
  }

  async init() {
    this.createCamera()
    this.createRendererPipeline()

    this.addSkyWash()
    this.addCelestialBackdrop()
    this.addCloudLayers()
    if (this.preset.sunRays?.enabled) {
      this.addSunRays()
    }
    this.addGrassBase()
    this.addGrassField()
    this.addFireflies()
    this.addPostProcessing()

    this.bindEvents()
    this.resize()
    this.animate()
  }

  private createCamera() {
    const { width, height } = this.getViewportSize()
    const aspect = width / height
    this.camera = new THREE.OrthographicCamera(
      -VIEW_HEIGHT * aspect / 2,
      VIEW_HEIGHT * aspect / 2,
      VIEW_HEIGHT / 2,
      -VIEW_HEIGHT / 2,
      0.1,
      500
    )
    this.camera.position.set(0, 0, 100)
  }

  private createRendererPipeline() {
    const { width, height } = this.getViewportSize()
    this.renderer.setSize(width, height, false)
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
  }

  private makeParallaxGroup(parallaxX: number, parallaxY: number, maxLift = Infinity): LayerGroup {
    const group = new THREE.Group() as LayerGroup
    group.userData = {
      baseX: 0,
      baseY: 0,
      parallaxX,
      parallaxY,
      maxLift
    }
    this.scene.add(group)
    this.parallaxGroups.push(group)
    return group
  }

  private addCoverPlane(
    material: THREE.ShaderMaterial | THREE.MeshBasicMaterial,
    z: number,
    group: THREE.Object3D = this.scene
  ) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material) as CoverPlane
    mesh.position.z = z
    mesh.frustumCulled = false
    group.add(mesh)
    this.coverPlanes.push(mesh)
    if (material instanceof THREE.ShaderMaterial) {
      this.shaderMaterials.push(material)
    }
    return mesh
  }

  private addSkyWash() {
    const material = createSkyMaterial(this.preset.sky, this.sunProgress)
    this.addCoverPlane(material, -96, this.makeParallaxGroup(0.05, 0.025))
  }

  private addCelestialBackdrop() {
    const { celestial } = this.preset
    if (!celestial) return

    if (celestial.stars.enabled) {
      const stars = createStarsMaterial(celestial.stars, this.viewWidth / this.viewHeight, reduceMotion)
      this.addCoverPlane(stars, -95, this.makeParallaxGroup(0.035, 0.018))
    }

    if (celestial.moon.enabled) {
      const moon = createMoonMaterial(celestial.moon, this.viewWidth / this.viewHeight)
      this.addCoverPlane(moon, -91, this.makeParallaxGroup(0.065, 0.032))
    }
  }

  private addSunRays() {
    const material = createSunRaysMaterial(this.sunProgress)
    this.addCoverPlane(material, -70, this.makeParallaxGroup(0.075, 0.04))
  }

  private addCloudLayers() {
    for (const visualLayer of this.preset.cloudVisualLayers) {
      const group = this.makeParallaxGroup(visualLayer.parallaxX, visualLayer.parallaxY)
      group.userData.baseX = visualLayer.baseX
      group.userData.baseY = visualLayer.baseY
      this.addCoverPlane(
        createLayerCloudMaterial(visualLayer, {
          sunProgress: this.sunProgress,
          aspect: this.viewWidth / this.viewHeight,
          reduceMotion
        }),
        visualLayer.z,
        group
      )
    }
  }

  private addGrassBase() {
    const group = this.makeParallaxGroup(0.42, 0.18, 0.035)
    group.userData.baseY = 0.08 + TERRAIN_LIFT * 0.45
    const material = createGrassBaseMaterial(this.preset.grass)
    this.addCoverPlane(material, -2, group)
  }

  private addGrassField() {
    const count = window.innerWidth < 720 ? 2400 : 8600
    const grassHalfWidth = 13.2
    const base = new THREE.PlaneGeometry(0.08, 1, 1, 6)
    base.translate(0, 0.5, 0)

    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.attributes.position = base.attributes.position
    geometry.attributes.uv = base.attributes.uv

    const offsets = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const angles = new Float32Array(count)
    const phases = new Float32Array(count)
    const depths = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const palette = makeColorPalette(this.preset.grass.midPalette)

    let placed = 0
    let attempts = 0
    while (placed < count && attempts < count * 22) {
      attempts += 1
      const x = THREE.MathUtils.randFloat(-grassHalfWidth, grassHalfWidth)
      const xNorm = (x + grassHalfWidth) / (grassHalfWidth * 2)
      const slopeTop =
        -1.62 -
        xNorm * 3.05 +
        Math.sin(xNorm * 4.8 + 0.45) * 0.24 +
        Math.sin(xNorm * 11.0 - 0.7) * 0.1 -
        THREE.MathUtils.smoothstep(xNorm, 0.58, 0.98) * 0.52
      const depth = Math.pow(Math.random(), 1.15) * 5.15
      const y = slopeTop - depth + THREE.MathUtils.randFloat(-0.12, 0.18)
      if (y < -7.95 || y > -1.15) continue

      const clumpA = 0.5 + 0.5 * Math.sin(x * 1.25 + Math.sin(x * 0.37) * 2.1)
      const clumpB = 0.5 + 0.5 * Math.sin(x * 2.9 + y * 1.4)
      const depth01 = THREE.MathUtils.clamp(depth / 5.15, 0, 1)
      const nearSlope = 1 - THREE.MathUtils.clamp(depth / 3.35, 0, 1)
      const lowerForeground = THREE.MathUtils.clamp((slopeTop - y) / 4.85, 0, 1)
      const crestBand = 1 - THREE.MathUtils.smoothstep(depth01, 0.18, 0.78)
      const leftEdgeClump = 1 - THREE.MathUtils.smoothstep(xNorm, 0.02, 0.22)
      const rightEdgeClump = THREE.MathUtils.smoothstep(xNorm, 0.78, 0.98)
      const density =
        0.28 +
        clumpA * 0.42 +
        clumpB * 0.24 +
        nearSlope * 0.16 +
        lowerForeground * 0.18 +
        crestBand * 0.2 +
        leftEdgeClump * 0.32 +
        rightEdgeClump * 0.22
      if (Math.random() > density) continue

      const z = 10.0 + lowerForeground * 4.4 + Math.random() * 2.8
      const i = placed
      offsets.set([x, y, z], i * 3)
      scales[i] =
        THREE.MathUtils.randFloat(0.16, 1.55) *
        (0.42 + depth01 * 1.18 + nearSlope * 0.12)
      angles[i] = THREE.MathUtils.randFloat(-0.46, 0.42) + (xNorm - 0.5) * 0.22
      phases[i] = Math.random() * Math.PI * 2
      depths[i] = depth01
      const color = palette[Math.floor(Math.random() * palette.length)].clone()
      color.offsetHSL(
        THREE.MathUtils.randFloat(-0.035, 0.035),
        0,
        THREE.MathUtils.randFloat(-0.07, 0.1) + nearSlope * 0.04
      )
      colors.set([color.r, color.g, color.b], i * 3)
      placed += 1
    }

    geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1))
    geometry.setAttribute('instanceAngle', new THREE.InstancedBufferAttribute(angles, 1))
    geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1))
    geometry.setAttribute('instanceDepth', new THREE.InstancedBufferAttribute(depths, 1))
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geometry.instanceCount = placed

    this.grassMaterial = createGrassMaterial({
      grass: this.preset.grass,
      reduceMotion,
      pointer: this.pointer,
      pointerWorld: this.pointerWorld,
      rippleTime: this.rippleTime,
      rippleOrigin: this.rippleOrigin
    })

    this.addDistantGrass()

    const mesh = new THREE.Mesh(geometry, this.grassMaterial)
    mesh.frustumCulled = false
    const group = this.makeParallaxGroup(0.52, 0.22, 0.045)
    group.userData.baseY = 0.35 + TERRAIN_LIFT
    group.add(mesh)
    this.addForegroundGrass()
  }

  private cloneGrassMaterial() {
    const sourceMaterial = this.grassMaterial
    if (!sourceMaterial) return
    const material = sourceMaterial.clone()
    material.uniforms = THREE.UniformsUtils.clone(sourceMaterial.uniforms)
    material.uniforms.uPointer.value = this.pointer
    material.uniforms.uPointerWorld.value = this.pointerWorld
    material.uniforms.uRippleOrigin.value = this.rippleOrigin
    this.shaderMaterials.push(material)
    return material
  }

  private addDistantGrass() {
    const count = window.innerWidth < 720 ? 560 : 1700
    const base = new THREE.PlaneGeometry(0.055, 1, 1, 5)
    base.translate(0, 0.5, 0)

    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.attributes.position = base.attributes.position
    geometry.attributes.uv = base.attributes.uv

    const offsets = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const angles = new Float32Array(count)
    const phases = new Float32Array(count)
    const depths = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const palette = makeColorPalette(this.preset.grass.distantPalette)

    let placed = 0
    let attempts = 0
    while (placed < count && attempts < count * 18) {
      attempts += 1
      const x = THREE.MathUtils.randFloat(-14.4, 14.4)
      const xNorm = (x + 14.4) / 28.8
      const crestY =
        -1.5 -
        xNorm * 3.15 +
        Math.sin(xNorm * 4.8 + 0.45) * 0.18 +
        Math.sin(xNorm * 9.0 - 0.55) * 0.07 -
        THREE.MathUtils.smoothstep(xNorm, 0.58, 0.98) * 0.46
      const depth = THREE.MathUtils.randFloat(0.08, 1.0)
      const y = crestY - THREE.MathUtils.randFloat(0.16, 1.28) + THREE.MathUtils.randFloat(-0.1, 0.12)
      if (y < -5.85 || y > -1.05) continue

      const density =
        0.42 +
        (0.5 + 0.5 * Math.sin(x * 1.55 + y * 1.1)) * 0.28 +
        (1 - THREE.MathUtils.smoothstep(depth, 0.34, 1.0)) * 0.22
      if (Math.random() > density) continue

      const i = placed
      offsets.set([x, y, 6.2 + depth * 2.3 + Math.random() * 1.0], i * 3)
      scales[i] = THREE.MathUtils.randFloat(0.18, 0.72) * THREE.MathUtils.lerp(1.05, 0.78, xNorm)
      angles[i] = THREE.MathUtils.randFloat(-0.36, 0.32) + (xNorm - 0.5) * 0.14
      phases[i] = Math.random() * Math.PI * 2
      depths[i] = THREE.MathUtils.randFloat(0.14, 0.46)
      const color = palette[Math.floor(Math.random() * palette.length)].clone()
      color.offsetHSL(
        THREE.MathUtils.randFloat(-0.025, 0.025),
        -0.03,
        THREE.MathUtils.randFloat(-0.05, 0.06)
      )
      colors.set([color.r, color.g, color.b], i * 3)
      placed += 1
    }

    geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1))
    geometry.setAttribute('instanceAngle', new THREE.InstancedBufferAttribute(angles, 1))
    geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1))
    geometry.setAttribute('instanceDepth', new THREE.InstancedBufferAttribute(depths, 1))
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geometry.instanceCount = placed

    const material = this.cloneGrassMaterial()
    if (!material) return
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    const group = this.makeParallaxGroup(0.34, 0.14, 0.04)
    group.userData.baseY = 0.44 + TERRAIN_LIFT
    group.add(mesh)
  }

  private addForegroundGrass() {
    const count = window.innerWidth < 720 ? 620 : 1340
    const cornerFillCount = window.innerWidth < 720 ? 96 : 220
    const cameraFillCount = window.innerWidth < 720 ? 140 : 320
    const base = new THREE.PlaneGeometry(0.1, 1, 1, 7)
    base.translate(0, 0.5, 0)

    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.attributes.position = base.attributes.position
    geometry.attributes.uv = base.attributes.uv

    const offsets = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const angles = new Float32Array(count)
    const phases = new Float32Array(count)
    const depths = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const palette = makeColorPalette(this.preset.grass.foregroundPalette)

    let placed = 0
    let attempts = 0
    while (placed < count && attempts < count * 16) {
      attempts += 1
      const cornerFill = placed < cornerFillCount
      const cameraFill = placed >= cornerFillCount && placed < cornerFillCount + cameraFillCount
      const x = cornerFill
        ? placed % 2 === 0
          ? THREE.MathUtils.randFloat(-13.8, -8.8)
          : THREE.MathUtils.randFloat(8.8, 13.8)
        : cameraFill
          ? THREE.MathUtils.randFloat(-14.2, 14.2)
          : THREE.MathUtils.randFloat(-12.6, 12.6)
      const xNorm = THREE.MathUtils.clamp((x + 14.2) / 28.4, 0, 1)
      const crestY =
        -1.72 -
        xNorm * 3.25 +
        Math.sin(xNorm * 4.8 + 0.45) * 0.22 -
        THREE.MathUtils.smoothstep(xNorm, 0.58, 0.98) * 0.5
      const depthFromCrest = cornerFill
        ? THREE.MathUtils.randFloat(3.15, 5.65)
        : cameraFill
          ? THREE.MathUtils.randFloat(4.9, 6.65)
          : THREE.MathUtils.randFloat(2.35, 5.35)
      const y = cameraFill
        ? THREE.MathUtils.randFloat(-8.35, -6.45) + Math.sin(xNorm * 7.6) * 0.08
        : crestY - depthFromCrest + (cornerFill
          ? THREE.MathUtils.randFloat(-0.3, 0.05)
          : THREE.MathUtils.randFloat(-0.16, 0.16))
      if (!cornerFill && !cameraFill && (y < -7.2 || y > -3.35)) continue
      const depth = cameraFill ? THREE.MathUtils.randFloat(0.88, 1.0) : THREE.MathUtils.randFloat(0.72, 1.0)
      const density =
        0.72 +
        (1 - Math.abs(xNorm - 0.5) * 2) * 0.08 +
        THREE.MathUtils.smoothstep(depth, 0.72, 1.0) * 0.14
      if (!cornerFill && !cameraFill && Math.random() > density) continue
      const i = placed
      offsets.set([x, y, (cameraFill ? 19.4 : cornerFill ? 16.2 : 15) + Math.random() * (cameraFill ? 4.6 : 2.8)], i * 3)
      scales[i] =
        THREE.MathUtils.randFloat(cameraFill ? 1.55 : cornerFill ? 1.15 : 0.9, cameraFill ? 3.35 : cornerFill ? 2.7 : 2.35) *
        (0.9 + depth * 0.32) *
        THREE.MathUtils.lerp(1.12, 0.72, xNorm)
      angles[i] = THREE.MathUtils.randFloat(-0.62, 0.5) + (xNorm - 0.5) * 0.18
      phases[i] = Math.random() * Math.PI * 2
      depths[i] = depth
      const color = palette[Math.floor(Math.random() * palette.length)].clone()
      color.offsetHSL(THREE.MathUtils.randFloat(-0.035, 0.03), 0, THREE.MathUtils.randFloat(-0.08, 0.08))
      colors.set([color.r, color.g, color.b], i * 3)
      placed += 1
    }

    geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 1))
    geometry.setAttribute('instanceAngle', new THREE.InstancedBufferAttribute(angles, 1))
    geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1))
    geometry.setAttribute('instanceDepth', new THREE.InstancedBufferAttribute(depths, 1))
    geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geometry.instanceCount = placed

    const material = this.cloneGrassMaterial()
    if (!material) return

    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    const group = this.makeParallaxGroup(0.66, 0.28, 0.045)
    group.userData.baseY = 0.18 + TERRAIN_LIFT
    group.add(mesh)
  }

  private addFireflies() {
    const fireflies = this.preset.celestial?.fireflies
    if (!fireflies?.enabled) return

    const { mesh, material } = createFireflyField(fireflies, reduceMotion)
    const group = this.makeParallaxGroup(0.46, 0.16, 0.035)
    group.userData.baseY = 0.22 + TERRAIN_LIFT
    group.add(mesh)
    this.shaderMaterials.push(material)
  }

  private addPostProcessing() {
    this.watercolorShaderPass = new ShaderPass(watercolorPass)
    this.watercolorShaderPass.uniforms.uStrength.value = reduceMotion
      ? this.preset.watercolorStrength * 0.35
      : this.preset.watercolorStrength
    this.composer.addPass(this.watercolorShaderPass)
  }

  private bindEvents() {
    const scheduleResize = () => this.scheduleResize()
    window.addEventListener('resize', scheduleResize)
    window.visualViewport?.addEventListener('resize', scheduleResize)
    window.visualViewport?.addEventListener('scroll', scheduleResize)
    this.resizeObserver = new ResizeObserver(scheduleResize)
    this.resizeObserver.observe(document.documentElement)
    this.resizeObserver.observe(document.body)

    window.addEventListener('pointermove', (event) => {
      const { width, height } = this.getViewportSize()
      this.pointerTarget.x = (event.clientX / width - 0.5) * 2
      this.pointerTarget.y = -(event.clientY / height - 0.5) * 2
      this.pointerWorldTarget.copy(this.screenToWorld(event.clientX, event.clientY))
    })

    window.addEventListener('pointerdown', (event) => {
      const world = this.screenToWorld(event.clientX, event.clientY)
      this.rippleOrigin.copy(world)
      this.pointerWorldTarget.copy(world)
      this.rippleTime = this.clock.elapsedTime
      for (const material of this.shaderMaterials) {
        if (!material.uniforms.uRippleOrigin || !material.uniforms.uRippleTime) continue
        material.uniforms.uRippleOrigin.value = this.rippleOrigin
        material.uniforms.uRippleTime.value = this.rippleTime
      }
    })

    window.addEventListener(
      'wheel',
      (event) => {
        if (this.preset.wheelControlsSunProgress) {
          this.targetSunProgress = THREE.MathUtils.clamp(
            this.targetSunProgress + Math.sign(event.deltaY) * -0.045,
            0.12,
            1
          )
        }
      },
      { passive: true }
    )

    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden
      if (this.isVisible) {
        this.clock.getDelta()
      }
    })

    window.addEventListener('deviceorientation', (event) => {
      if (!event.gamma || !event.beta) return
      this.pointerTarget.x = THREE.MathUtils.clamp(event.gamma / 28, -1, 1)
      this.pointerTarget.y = THREE.MathUtils.clamp((event.beta - 45) / -40, -1, 1)
    })
  }

  private screenToWorld(clientX: number, clientY: number) {
    const { width, height } = this.getViewportSize()
    const x = (clientX / width - 0.5) * this.viewWidth
    const y = -(clientY / height - 0.5) * this.viewHeight
    return new THREE.Vector2(x, y)
  }

  private getViewportSize() {
    const visualViewport = window.visualViewport
    const width = Math.max(
      1,
      Math.ceil(Math.max(window.innerWidth, document.documentElement.clientWidth, visualViewport?.width ?? 0))
    )
    const height = Math.max(
      1,
      Math.ceil(Math.max(window.innerHeight, document.documentElement.clientHeight, visualViewport?.height ?? 0))
    )
    return { width, height }
  }

  private scheduleResize() {
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame)
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0
      this.resize()
    })
  }

  private resize() {
    const { width, height } = this.getViewportSize()
    const aspect = width / height
    this.viewWidth = VIEW_HEIGHT * aspect
    this.viewHeight = VIEW_HEIGHT
    document.documentElement.style.setProperty('--app-width', `${width}px`)
    document.documentElement.style.setProperty('--app-height', `${height}px`)

    this.camera.left = -this.viewWidth / 2
    this.camera.right = this.viewWidth / 2
    this.camera.top = this.viewHeight / 2
    this.camera.bottom = -this.viewHeight / 2
    this.camera.updateProjectionMatrix()

    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)

    for (const mesh of this.coverPlanes) {
      mesh.scale.set(this.viewWidth * COVER_PLANE_OVERSCAN, this.viewHeight * COVER_PLANE_OVERSCAN, 1)
    }

    for (const material of this.shaderMaterials) {
      if (material.uniforms.uSun?.value instanceof THREE.Vector2) {
        const sunUniform = material.uniforms.uSun.value as THREE.Vector2
        const isMainSun = sunUniform.y > 0.63
        sunUniform.x = aspect < 0.75 ? 0.63 : isMainSun ? 0.79 : 0.76
      }
      if (material.uniforms.uAspect) {
        material.uniforms.uAspect.value = aspect
      }
    }

  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    if (!this.isVisible) return

    const delta = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.elapsedTime
    const speed = reduceMotion ? 0.18 : 1

    this.pointer.lerp(this.pointerTarget, reduceMotion ? 0.04 : 0.075)
    this.pointerWorld.lerp(this.pointerWorldTarget, reduceMotion ? 0.08 : 0.16)
    this.sunProgress = THREE.MathUtils.lerp(this.sunProgress, this.targetSunProgress, delta * 1.4)

    for (const material of this.shaderMaterials) {
      if (material.uniforms.uTime) material.uniforms.uTime.value = time * speed
      if (material.uniforms.uSunProgress) material.uniforms.uSunProgress.value = this.sunProgress
      if (material.uniforms.uMotionScale) material.uniforms.uMotionScale.value = reduceMotion ? 0.34 : 1
    }

    if (this.grassMaterial) {
      const gust =
        0.38 +
        Math.sin(time * 0.42) * 0.16 +
        Math.sin(time * 1.72) * 0.08 +
        THREE.MathUtils.clamp(Math.abs(this.pointer.x) * 0.22, 0, 0.22)
      for (const material of this.shaderMaterials) {
        if (!material.uniforms.uWindStrength) continue
        material.uniforms.uTime.value = time * speed
        material.uniforms.uWindStrength.value = reduceMotion ? 0.08 : gust
        material.uniforms.uPointer.value = this.pointer
        material.uniforms.uPointerWorld.value = this.pointerWorld
      }
    }

    if (this.watercolorShaderPass) {
      this.watercolorShaderPass.uniforms.uTime.value = time * speed
    }

    this.updateParallax()
    this.composer.render()
  }

  private updateParallax() {
    const sunriseLift = (this.sunProgress - this.preset.initialSunProgress) * 0.18
    for (const group of this.parallaxGroups) {
      const pointerLift = this.pointer.y * group.userData.parallaxY
      const clampedLift = pointerLift > 0 ? Math.min(pointerLift, group.userData.maxLift) : pointerLift
      group.position.x = group.userData.baseX + this.pointer.x * group.userData.parallaxX
      group.position.y = group.userData.baseY + clampedLift + sunriseLift * group.userData.parallaxY
    }
  }

}
