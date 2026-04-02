import { Routes, Route } from "react-router-dom";

import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/register" element={<RegisterCard />} />
        <Route path="/login" element={<LoginCard />} />
        <Route path="/" element={<RegisterCard />} />
      </Routes>
    </div>
  );
}

export default App;
