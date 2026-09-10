import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Card } from "react-bootstrap";

import logo from "@/assets/images/logo.png";

// Layout do grupo /auth (login, logout, forgot-password).
// Referência visual: warren/Portal/src/Pages/Auth/Login.tsx (.auth-shell / .auth-card).
export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="auth-shell">
      <Card className="auth-card">
        <div className="auth-brand">
          <img src={logo} alt="Alex Stewart" className="auth-brand__logo" />
          <div>
            <div className="auth-brand__title">Alex Stewart</div>
            <div className="auth-brand__subtitle">Core</div>
          </div>
        </div>

        <Outlet />
      </Card>
    </div>
  );
}
