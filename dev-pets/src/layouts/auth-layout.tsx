import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/auth-context";

const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default AuthLayout;
