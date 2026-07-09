import { Navigate, Route, Routes } from "react-router-dom";
import { getSession } from "./lib/api";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Purchasing from "./pages/Purchasing";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Employees from "./pages/Employees";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";

/** Routes: /login is public; everything else lives inside the desktop-style shell. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={getSession() ? <Shell /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/purchasing" element={<Purchasing />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
