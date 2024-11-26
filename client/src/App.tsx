import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Dashboard from "@/pages/Dashboard";
import Reports from "@/pages/Reports";
import Products from "@/pages/Products";
import Clients from "@/pages/Clients";
import Offers from "@/pages/Offers";
import Pipeline from "@/pages/Pipeline";
import Settings from "@/pages/Settings";
import ProductsSold from "@/pages/ProductsSold";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/products" element={<Products />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/products-sold" element={<ProductsSold />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </Router>
  );
}
