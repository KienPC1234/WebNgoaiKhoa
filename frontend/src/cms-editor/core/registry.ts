import type { BlockDefinition, BlockType } from './types'

class BlockRegistry {
  private definitions = new Map<BlockType, BlockDefinition>()

  register(definition: BlockDefinition) {
    this.definitions.set(definition.type, definition)
  }

  get(type: string) {
    return this.definitions.get(type as BlockType)
  }

  list() {
    return Array.from(this.definitions.values())
  }

  listByCategory(category: BlockDefinition['category']) {
    return this.list().filter((d) => d.category === category)
  }
}

export const blockRegistry = new BlockRegistry()
