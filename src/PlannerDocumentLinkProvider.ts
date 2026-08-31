import vscode from 'vscode'

import { findPlannerGoalReferences } from './plannerGoalReferences'

const DEFAULT_PLANNER_BASE_URL = 'https://planner.monopoly-gold.com/app'

export class PlannerDocumentLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const baseUrl = vscode.workspace
      .getConfiguration('cucumber', document.uri)
      .get<string>('plannerBaseUrl', DEFAULT_PLANNER_BASE_URL)
      .replace(/\/+$/, '')

    if (!baseUrl) return []

    return findPlannerGoalReferences(document.getText()).map(({ start, end, goalId }) => {
      const link = new vscode.DocumentLink(
        new vscode.Range(document.positionAt(start), document.positionAt(end)),
        vscode.Uri.parse(`${baseUrl}#goal/${goalId}`)
      )
      link.tooltip = `Открыть цель ${goalId.slice(0, 8)} в Planner`
      return link
    })
  }
}
