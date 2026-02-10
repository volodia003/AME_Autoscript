import { AuthProvider } from "../contexts/auth-context";

export const withAuth = (component: () => React.ReactNode) => () => {
  return <AuthProvider>{component()}</AuthProvider>;
};
