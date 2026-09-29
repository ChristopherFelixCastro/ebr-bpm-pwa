// sortOrder es relativo a cada padre: la jerarquía se reconstruye agrupando por padre y ordenando
// dentro de cada grupo por sortOrder y luego id, igual que Core. Acepta la respuesta anidada de Core
// o una lista plana en cualquier orden; nunca ordena globalmente por sortOrder.
export type TreeRow = { id: string; parentId: string | null; sortOrder: number; children?: TreeRow[] }
export type TreeNode<T> = { item: T; depth: number; children: TreeNode<T>[] }

export function flattenTree<T extends TreeRow>(rows: readonly T[]): T[] {
  const out: T[] = []
  const walk = (list: readonly T[]) => list.forEach((row) => { out.push(row); if (row.children?.length) walk(row.children as T[]) })
  walk(rows)
  return out
}

export function buildTree<T extends TreeRow>(rows: readonly T[]): TreeNode<T>[] {
  const flat = flattenTree(rows)
  const ids = new Set(flat.map((row) => row.id))
  const byParent = new Map<string | null, T[]>()
  for (const row of flat) {
    // Un padre inexistente se muestra en la raíz para que la validación de Core sea visible.
    const parent = row.parentId && ids.has(row.parentId) ? row.parentId : null
    byParent.set(parent, [...(byParent.get(parent) ?? []), row])
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
  const seen = new Set<string>()
  const build = (parent: string | null, depth: number): TreeNode<T>[] => (byParent.get(parent) ?? [])
    .filter((row) => !seen.has(row.id))
    .map((row) => { seen.add(row.id); return { item: row, depth, children: build(row.id, depth + 1) } })
  const roots = build(null, 1)
  // Filas en un ciclo no cuelgan de la raíz; se muestran al final para no ocultar el error que Core reporta.
  for (const row of flat) if (!seen.has(row.id)) { seen.add(row.id); roots.push({ item: row, depth: 1, children: build(row.id, 2) }) }
  return roots
}

export const walkTree = <T,>(nodes: TreeNode<T>[]): TreeNode<T>[] => nodes.flatMap((node) => [node, ...walkTree(node.children)])
