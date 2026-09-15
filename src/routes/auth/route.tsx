import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Card } from "react-bootstrap";

import loginBg from "@/assets/images/login-bg.webp";
import { AppBrand } from "@/layouts/AppBrand";

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
        backgroundImage: `linear-gradient(rgba(var(--bs-dark-rgb), 0.45), rgba(var(--bs-dark-rgb), 0.45)), url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Card className="auth-card">
        <AppBrand size="sm" variant="badge" className="auth-brand" />

        <Outlet />
      </Card>
    </div>
  );
}
