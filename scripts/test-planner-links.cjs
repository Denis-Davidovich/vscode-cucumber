#!/usr/bin/env node

const assert = require('node:assert/strict')

const {
  findPlannerGoalReferences,
} = require('../dist/src/plannerGoalReferences.js')

const goalId = '019edad5-d1ae-765a-b64d-a5952779c3a1'
const validTag = `  @verifies @CASE-${goalId}`
const documentedComment = `# @verifies CASE-TCB (${goalId}) — описание`

assert.deepEqual(findPlannerGoalReferences(validTag), [
  {
    start: 2,
    end: validTag.length,
    goalId,
  },
])

assert.deepEqual(findPlannerGoalReferences(documentedComment), [
  {
    start: 2,
    end: documentedComment.indexOf(goalId) + goalId.length,
    goalId,
  },
])

assert.deepEqual(findPlannerGoalReferences('@verifies CASE-019edad5'), [])
assert.deepEqual(findPlannerGoalReferences(`@other @CASE-${goalId}`), [])

console.log('Planner document-link parser tests passed.')
