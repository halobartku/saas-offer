import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "./components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductsSold from "./pages/ProductsSold";
import Clients from "./pages/Clients";
import Offers from "./pages/Offers";
import Pipeline from "./pages/Pipeline";
import Navbar from "./components/Navbar";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SWRConfig value={{ fetcher }}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/products" component={Products} />
            <Route path="/products-sold" component={ProductsSold} />
            <Route path="/clients" component={Clients} />
            <Route path="/offers" component={Offers} />
            <Route path="/pipeline" component={Pipeline} />
            <Route>404 Page Not Found</Route>
          </Switch>
        </main>
        <Toaster />
      </div>
    </SWRConfig>
  </StrictMode>
);
