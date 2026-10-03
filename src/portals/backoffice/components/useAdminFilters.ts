import { useDeferredValue } from "react";
import { useSearchParams } from "react-router-dom";

export function useAdminFilters() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const search = useDeferredValue(q.trim().toLocaleLowerCase("vi"));
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && (value !== "all" || key === "scope")) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }
  return {
    params,
    q,
    search,
    update,
    reset: () => setParams({}, { replace: true }),
  };
}
