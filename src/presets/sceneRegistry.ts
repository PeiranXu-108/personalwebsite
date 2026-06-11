import { nightPreset } from './night.ts'
import { sunrisePreset } from './sunrise.ts'
import type { SceneId, ScenePreset } from './types.ts'

export type { SceneId, ScenePreset } from './types.ts'

export const scenePresets = [sunrisePreset, nightPreset] as const satisfies readonly ScenePreset[]

const scenePresetById = new Map<SceneId, ScenePreset>(
  scenePresets.map((preset) => [preset.id, preset])
)

export function resolveSceneId(searchParams: URLSearchParams): SceneId {
  const requested = searchParams.get('scene')
  return requested === 'night' || requested === 'sunrise' ? requested : 'sunrise'
}

export function getScenePreset(searchParams: URLSearchParams): ScenePreset {
  return scenePresetById.get(resolveSceneId(searchParams)) ?? sunrisePreset
}
