import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Card } from "react-bootstrap";

import logo from "@/assets/images/logo.png";
import loginBg from "@/assets/images/login-bg.jpg";

// Layout do grupo /auth (login, logout, forgot-password).
// Referência visual: warren/Portal/src/Pages/Auth/Login.tsx (.auth-shell / .auth-card).
export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div
      className="auth-shell"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
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
