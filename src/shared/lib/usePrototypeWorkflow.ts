import { useSearchParams } from "react-router-dom";

export type WorkflowActions<S extends string> = Partial<
  Record<S, { status: S; label: string }[]>
>;

export function usePrototypeWorkflow<S extends string>(
  initial: S,
  actions: WorkflowActions<S>,
) {
  const [params] = useSearchParams();
  const target = params.get("workflow");
  const saved = params.get("workflowPath")?.split(",") as S[] | undefined;
  const validSaved =
    saved?.[0] === initial &&
    saved[saved.length - 1] === target &&
    saved.every(
      (status, index) =>
        index === 0 ||
        actions[saved[index - 1]]?.some((action) => action.status === status),
    );
  const queue: S[][] = [[initial]];
  let path: S[] = [initial];
  while (queue.length) {
    const candidate = queue.shift()!;
    const current = candidate[candidate.length - 1];
    if (current === target) {
      path = candidate;
      break;
    }
    for (const action of actions[current] ?? []) {
      if (!candidate.includes(action.status))
        queue.push([...candidate, action.status]);
    }
  }
  if (validSaved && saved) path = saved;
  return {
    path,
    status: path[path.length - 1],
    preview: path
      .slice(1)
      .map((status) => ({
        status,
        note: params.get(`note-${status}`) ?? "Đã cập nhật bước xử lý mẫu.",
      })),
  };
}
