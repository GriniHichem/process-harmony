/**
 * Centralized progress calculation logic for projects, actions, and tasks.
 * Single source of truth — used by ProjectActionsList, ProjectPlanningPage,
 * Actions page, and useDashboardStats.
 */

const TERMINAL_TASK_STATUSES = new Set(["termine", "terminee", "cloturee"]);
const TODO_TASK_STATUSES = new Set(["a_faire"]);

const TERMINAL_ACTION_STATUSES = new Set(["terminee", "termine", "cloturee"]);
const CANCELLED_ACTION_STATUSES = new Set(["annulee"]);

export interface TaskLike {
  statut: string;
  avancement: number | null | undefined;
}

export interface ActionLike {
  id: string;
  statut: string;
  avancement: number | null | undefined;
  multi_tasks?: boolean | null;
  poids?: number | null;
}

/**
 * Normalize a task's progress according to its status.
 * - terminé/clôturé → 100
 * - à faire → 0
 * - en cours → bounded between 1 and 99
 */
export function normalizeTaskProgress(task: TaskLike): number {
  const statut = task.statut ?? "";
  const raw = Number(task.avancement ?? 0);
  if (TERMINAL_TASK_STATUSES.has(statut)) return 100;
  if (TODO_TASK_STATUSES.has(statut)) return 0;
  // en_cours or any other intermediate status
  if (raw >= 100) return 99;
  if (raw <= 0) return 1;
  return Math.round(raw);
}

/**
 * Compute the avancement of a multi-task action from its tasks.
 * Returns the average of normalized task progress values.
 */
export function computeMultiTaskActionProgress(tasks: TaskLike[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const sum = tasks.reduce((s, t) => s + normalizeTaskProgress(t), 0);
  return Math.round(sum / tasks.length);
}

/**
 * Get the effective avancement of an action, considering its tasks if multi-task mode.
 */
export function getActionEffectiveProgress(
  action: ActionLike,
  tasks?: TaskLike[]
): number {
  if (action.multi_tasks && tasks && tasks.length > 0) {
    return computeMultiTaskActionProgress(tasks);
  }
  return Math.max(0, Math.min(100, Math.round(Number(action.avancement ?? 0))));
}

/**
 * Compute weighted project progress from its actions.
 * - Actions with explicit `poids` use that weight.
 * - Actions without `poids` share the remaining weight equally.
 * - Cancelled actions are excluded from the calculation.
 */
export function computeProjectProgress(
  actions: Array<ActionLike & { _effectiveProgress?: number }>,
  tasksByAction?: Record<string, TaskLike[]>
): number {
  const active = actions.filter((a) => !CANCELLED_ACTION_STATUSES.has(a.statut));
  if (active.length === 0) return 0;

  const totalFixedWeight = active.reduce((s, a) => s + (a.poids ?? 0), 0);
  const remainingWeight = Math.max(0, 100 - totalFixedWeight);
  const autoCount = active.filter((a) => a.poids == null).length;
  const autoWeight = autoCount > 0 ? remainingWeight / autoCount : 0;

  const totalWeight = active.reduce((s, a) => s + (a.poids ?? autoWeight), 0);
  if (totalWeight === 0) {
    // Fallback: simple average of effective progress
    const sum = active.reduce((s, a) => {
      const p = a._effectiveProgress ?? getActionEffectiveProgress(a, tasksByAction?.[a.id]);
      return s + p;
    }, 0);
    return Math.round(sum / active.length);
  }

  const weighted = active.reduce((s, a) => {
    const w = a.poids ?? autoWeight;
    const p = a._effectiveProgress ?? getActionEffectiveProgress(a, tasksByAction?.[a.id]);
    return s + (p * w) / 100;
  }, 0);

  // Re-normalize when total weight ≠ 100 (e.g. only auto-weight actions and totalFixed=0 → totalWeight=100)
  return Math.round((weighted * 100) / totalWeight);
}

export { TERMINAL_ACTION_STATUSES, CANCELLED_ACTION_STATUSES };
