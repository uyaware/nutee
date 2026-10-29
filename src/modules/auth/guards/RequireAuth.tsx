import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Portal } from "@/shared/types/database";
import type { Permission } from "@/modules/auth/model/permissions";
import { hasPermission } from "@/modules/auth/model/permissions";
import { useSession } from "@/modules/auth/hooks/useSession";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
export function RequireAuth({
  portal,
  permission,
}: {
  portal: Portal;
  permission?: Permission;
}) {
  const session = useSession(portal);
  const location = useLocation();
  if (session.isPending) return <LoadingState />;
  if (session.isError)
    return (
      <ErrorState error={session.error} retry={() => void session.refetch()} />
    );
  if (!session.data)
    return (
      <Navigate
        replace
        to={`${portal === "customer" ? "/login" : "/management/login"}?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  if (permission && !hasPermission(session.data.role, permission))
    return (
      <Navigate
        replace
        to={portal === "customer" ? "/403" : "/management/403"}
      />
    );
  return <Outlet />;
}
