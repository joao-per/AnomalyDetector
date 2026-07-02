import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { Dashboard } from "@/pages/Dashboard";
import { EmailComposer } from "@/pages/EmailComposer";
import { Login } from "@/pages/Login";
import { Untrained } from "@/pages/Untrained";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/untrained" element={<RequireAuth><Untrained /></RequireAuth>} />
      <Route
        path="/anomalies/:id/email"
        element={<RequireAuth><EmailComposer /></RequireAuth>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
