import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Payments from "./pages/Payments";
import Maintenance from "./pages/Maintenance";
import Contracts from "./pages/Contracts";
import Register from "./pages/Register";
import Users from "./pages/Users";
import Notifications from "./pages/Notifications";


// Layout
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page login */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Toutes les pages avec sidebar */}
        <Route element={<MainLayout />}>
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/users" element={<Users />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
