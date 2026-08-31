const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export interface PlannerGoalReference {
  end: number
  goalId: string
  start: number
}

export function findPlannerGoalReferences(text: string): PlannerGoalReference[] {
  const pattern = new RegExp(`@verifies\\b[^\\r\\n]*?\\b(${UUID_PATTERN})\\b`, 'gi')
  const references: PlannerGoalReference[] = []

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    references.push({
      end: match.index + match[0].length,
      goalId: match[1],
      start: match.index,
    })
  }

  return references
}
