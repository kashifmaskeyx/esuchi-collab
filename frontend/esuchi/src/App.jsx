import { Routes, Route } from "react-router-dom";

import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import OtpCard from "./components/OTPCard";
import LandingPage from "./components/LandingPage";
import ForgotPasswordCard from "./components/ForgotPasswordCard";
import ResetPasswordCard from "./components/ResetPasswordCard";
import Shipping from "./components/Shipping";
import Products from "./components/Products";
import AppShell from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";

const BlankPage = () => (
  <div style={{ minHeight: "100vh", background: "#ffffff" }} />
); // Replace when the component is ready

function App() {
  return (
    <div>
      <Routes>
        <Route path="/register" element={<RegisterCard />} />
        <Route path="/login" element={<LoginCard />} />
        <Route path="/forgot-password" element={<ForgotPasswordCard />} />
        <Route path="/otp" element={<OtpCard />} />
        <Route path="/reset-password" element={<ResetPasswordCard />} />
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<BlankPage />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<BlankPage />} />
          <Route path="/shipment" element={<Shipping />} />
          <Route path="/finances" element={<BlankPage />} />
          <Route path="/analytics" element={<BlankPage />} />
          <Route path="/marketing" element={<BlankPage />} />
          <Route path="/discounts" element={<BlankPage />} />
          <Route path="/settings" element={<BlankPage />} />
          <Route path="/help-center" element={<BlankPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
