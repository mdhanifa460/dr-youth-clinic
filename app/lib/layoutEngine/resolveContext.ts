import type { ISectionCondition } from '@/app/models/Section';

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// Resolves a registry entry's `contextBindings` (prop name -> dot-path into
// the page's render context) into actual prop values — e.g. EMI Calculator's
// `price` pulled live from `page.price` instead of a duplicated content field.
export function resolveContextBindings(
  bindings: Record<string, string> | undefined,
  context: Record<string, any>
): Record<string, any> {
  if (!bindings) return {};
  const resolved: Record<string, any> = {};
  for (const [propName, path] of Object.entries(bindings)) {
    const value = getByPath(context, path);
    if (value !== undefined) resolved[propName] = value;
  }
  return resolved;
}

// Deliberately one flat comparison — not a rule engine. Personalization
// Rules / a full Conditions evaluator are out of scope for this phase.
export function evaluateCondition(condition: ISectionCondition | undefined, context: Record<string, any>): boolean {
  if (!condition) return true;
  const actual = getByPath(context, condition.field);
  switch (condition.operator) {
    case 'eq': return actual === condition.value;
    case 'neq': return actual !== condition.value;
    case 'gt': return typeof actual === 'number' && actual > condition.value;
    case 'lt': return typeof actual === 'number' && actual < condition.value;
    case 'exists': return actual !== undefined && actual !== null;
    default: return true;
  }
}
