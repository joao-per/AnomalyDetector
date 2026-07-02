import { Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { EmailComposer } from "@/pages/EmailComposer";
import { Untrained } from "@/pages/Untrained";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/untrained" element={<Untrained />} />
      <Route path="/anomalies/:id/email" element={<EmailComposer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
