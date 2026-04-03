import { Routes, Route } from "react-router-dom";

import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import DashboardPage from "./pages/DashboardPage";

const BlankPage = () => <div style={{ minHeight: "100vh", background: "#ffffff" }} />; // Replace when the component is ready

function App() {
  return (
    <div>
      <Routes>
        <Route path="/register" element={<RegisterCard />} />
        <Route path="/login" element={<LoginCard />} />
        <Route path="/" element={<RegisterCard />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<BlankPage />} />
        <Route path="/products" element={<BlankPage />} />
        <Route path="/customers" element={<BlankPage />} />
        <Route path="/finances" element={<BlankPage />} />
        <Route path="/analytics" element={<BlankPage />} />
        <Route path="/marketing" element={<BlankPage />} />
        <Route path="/discounts" element={<BlankPage />} />
      </Routes>
    </div>
  );
}

export default App;
