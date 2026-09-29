import { buildTree, walkTree } from '../utils/tree'

type PackageItem = { id: string; parentItemId: string | null; sortOrder: number }

/**
 * Reading order of a BPM package: depth-first by parent, then sortOrder and id (as Core does).
 * Also repairs packages stored before Core sent depth-first order; never sorts globally by sortOrder.
 */
export function orderBpmItems<T extends PackageItem>(items: readonly T[]): Array<{ item: T; depth: number }> {
  const rows = items.map((item) => ({ id: item.id, parentId: item.parentItemId, sortOrder: item.sortOrder, item }))
  return walkTree(buildTree(rows)).map((node) => ({ item: node.item.item, depth: node.depth }))
}
