import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/dashboard" className="text-xl font-bold text-gray-900">
              SaaS Offer
            </a>
            <nav className="ml-10 space-x-4">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-900">
                Dashboard
              </a>
              <a href="/products" className="text-gray-500 hover:text-gray-900">
                Products
              </a>
              <a href="/organizations" className="text-gray-500 hover:text-gray-900">
                Organizations
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={() => logout()}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
