import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import OtpCard from "./components/OTPCard";
import LandingPage from "./components/LandingPageV2";
import ForgotPasswordCard from "./components/ForgotPasswordCard";
import ResetPasswordCard from "./components/ResetPasswordCard";
import Shipping from "./components/Shipping";
import Products from "./components/Products";
import Inventory from "./components/Inventory";
import AppShell from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./components/ProfilePage";
import SalesOrders from "./components/SalesOrders";
import StaffRoles from "./components/StaffRoles";
import AdminDashboard from "./components/AdminDashboard";
import PendingApproval from "./components/PendingApproval";
import { getStoredUser } from "./api/auth";
import Returns from "./components/Returns";

const BlankPage = () => (
  <div style={{ minHeight: "100vh", background: "#ffffff" }} />
); // Replace when the component is ready

const ProtectedRoute = () => {
  const user = getStoredUser();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const ApprovedRoute = () => {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.membershipStatus !== "approved") {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Outlet />;
};

const UserRoute = () => {
  const currentUser = getStoredUser();
  const isAdminUser = currentUser?.role === "admin";

  if (isAdminUser) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

const AdminRoute = () => {
  const currentUser = getStoredUser();
  const isAdminUser = currentUser?.role === "admin";

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.membershipStatus !== "approved") {
    return <Navigate to="/pending-approval" replace />;
  }

  return isAdminUser ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <div>
      <Routes>
  <Route path="/register" element={<RegisterCard />} />
  <Route path="/login" element={<LoginCard />} />
  <Route path="/forgot-password" element={<ForgotPasswordCard />} />
  <Route path="/otp" element={<OtpCard />} />
  <Route path="/reset-password" element={<ResetPasswordCard />} />
  <Route path="/pending-approval" element={<PendingApproval />} />
  <Route path="/" element={<LandingPage />} />
  <Route element={<AdminRoute />}>
    <Route path="/admin" element={<AdminDashboard />} />
  </Route>

  <Route element={<ProtectedRoute />}>
    <Route element={<ApprovedRoute />}>
    <Route element={<UserRoute />}>
      <Route element={<AppShell />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/orders" element={<SalesOrders />} />
      <Route path="/returns" element={<Returns />} />
      <Route path="/products" element={<Products />} />
      <Route path="/customers" element={<BlankPage />} />
      <Route path="/shipment" element={<Shipping />} />
      <Route path="/staff" element={<StaffRoles />} />
      <Route path="/finances" element={<BlankPage />} />
      <Route path="/analytics" element={<BlankPage />} />
      <Route path="/marketing" element={<BlankPage />} />
      <Route path="/discounts" element={<BlankPage />} />
      <Route path="/settings" element={<ProfilePage />} />
      <Route path="/help-center" element={<BlankPage />} />
      </Route>
    </Route>
    </Route>
  </Route>
</Routes>
    </div>
  );
}

export default App;
