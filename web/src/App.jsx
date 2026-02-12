import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Properties = lazy(() => import("./pages/Properties"));
const Tenants = lazy(() => import("./pages/Tenants"));
const Payments = lazy(() => import("./pages/Payments"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Users = lazy(() => import("./pages/Users"));


// Layout
const MainLayout = lazy(() => import("./layouts/MainLayout"));

function RouteLoader() {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
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
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
