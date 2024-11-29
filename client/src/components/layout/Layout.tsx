import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  FileText,
  PieChart,
  Package,
  ShoppingCart,
  Mail,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: '/clients', label: 'Clients', icon: <Users className="w-4 h-4" /> },
    { path: '/offers', label: 'Offers', icon: <FileText className="w-4 h-4" /> },
    { path: '/pipeline', label: 'Pipeline', icon: <PieChart className="w-4 h-4" /> },
    { path: '/products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { path: '/products-sold', label: 'Products Sold', icon: <ShoppingCart className="w-4 h-4" /> },
    { path: '/emails', label: 'Emails', icon: <Mail className="w-4 h-4" /> },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold">SaaS Offer</h1>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm ${pathname === item.path ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;