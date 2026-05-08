interface CategoriesFileShape {
  categories?: unknown
}

export const validateCategories = (raw: unknown): string[] => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Categories file must be a JSON object.')
  }

  const parsed = raw as CategoriesFileShape
  if (!Array.isArray(parsed.categories)) {
    throw new Error('Categories file must include a "categories" array.')
  }

  const categories: string[] = []
  const seen = new Set<string>()

  for (const item of parsed.categories) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error('Each category must be a non-empty string.')
    }
    const trimmed = item.trim()
    const key = trimmed.toLowerCase()
    if (seen.has(key)) {
      throw new Error(`Duplicate category in list: ${trimmed}`)
    }
    seen.add(key)
    categories.push(trimmed)
  }

  if (categories.length === 0) {
    throw new Error('At least one category is required.')
  }

  return categories
}

export const loadCategories = async (): Promise<string[]> => {
  const response = await fetch('/data/categories.json')
  if (!response.ok) {
    throw new Error('Could not load categories file at /data/categories.json')
  }

  const raw = (await response.json()) as unknown
  return validateCategories(raw)
}
