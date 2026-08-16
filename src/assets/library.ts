// 一致性资产库：角色/场景/道具的主图与逐镜变体登记，参考图自动注入提示词。
// 对标全自动漫剧项目的"资产库一致性"能力（他们有的，我们补上）。
export interface AssetVariation {
  shotId: string
  url: string
}

export interface Asset {
  id: string
  kind: 'character' | 'scene' | 'prop'
  name: string
  masterUrl: string
  variations: AssetVariation[]
}

export interface AssetLibraryData {
  assets: Asset[]
}

export interface AssetLibrary {
  addMaster(kind: Asset['kind'], name: string, masterUrl: string): Asset
  addVariation(id: string, shotId: string, url: string): void
  byId(id: string): Asset | undefined
  byKind(kind: Asset['kind']): Asset[]
  list(): Asset[]
  export(): AssetLibraryData
}

export function createAssetLibrary(initial: AssetLibraryData = { assets: [] }): AssetLibrary {
  const data: AssetLibraryData = { assets: [...(initial.assets ?? [])] }
  return {
    addMaster(kind, name, masterUrl) {
      const asset: Asset = { id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, name, masterUrl, variations: [] }
      data.assets.push(asset)
      return asset
    },
    addVariation(id, shotId, url) {
      const a = data.assets.find((x) => x.id === id)
      if (!a) throw new Error(`资产不存在: ${id}`)
      a.variations.push({ shotId, url })
    },
    byId(id) { return data.assets.find((x) => x.id === id) },
    byKind(kind) { return data.assets.filter((x) => x.kind === kind) },
    list() { return [...data.assets] },
    export() { return { assets: data.assets.map((a) => ({ ...a, variations: [...a.variations] })) } },
  }
}

/** 把该镜头涉及的资产参考图注入提示词（一致性：主图优先，其次该镜变体）。 */
export function injectReferences(prompt: string, refs: { name: string; url: string }[]): string {
  if (!refs.length) return prompt
  const block = refs.map((r) => `${r.name}（参考图: ${r.url}）`).join('；')
  return `${prompt}\n角色与场景保持一致，参考: ${block}`
}
