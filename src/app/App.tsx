import { useState, useEffect, useRef } from "react";
import { RepPerformanceDashboard } from "./components/multiplicity/RepPerformanceDashboard";
import { ManagerPerformanceDashboard } from "./components/multiplicity/ManagerPerformanceDashboard";
import { AuthProvider, useAuth } from "./components/auth/AuthProvider";
import { DemoLoginPage } from "./components/auth/DemoLoginPage";
import { Button } from "./components/ui/button";
import { Users, User, Sparkles, LogOut, ChevronDown } from "lucide-react";

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const userRole = user?.user_metadata?.role || 'rep';
  const isManager = userRole === 'manager';
  const [view, setView] = useState<"rep" | "manager">(isManager ? "manager" : "rep");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Force rep users to stay on rep view
  useEffect(() => {
    if (!isManager && view === 'manager') {
      setView('rep');
    }
  }, [isManager, view]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <DemoLoginPage />;
  }

  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top Navigation Bar */}
      <div className="bg-[#0f172a] border-b border-cyan-500/30 px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Multiplicity Performance</h1>
                <p className="text-xs text-gray-400">Sales Performance Analytics</p>
              </div>
            </div>
            
            {/* View Toggle - Only show for managers */}
            {isManager ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg border border-blue-500 transition-colors"
                >
                  {view === "manager" ? (
                    <>
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">Manager View</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Rep View</span>
                    </>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a24] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setView("rep");
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        view === "rep" ? "bg-blue-600/20 text-blue-400" : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Rep View</span>
                    </button>
                    <button
                      onClick={() => {
                        setView("manager");
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        view === "manager" ? "bg-blue-600/20 text-blue-400" : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">Manager View</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Rep View</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white text-sm font-semibold">{userName}</p>
              <p className="text-xs text-cyan-400 capitalize">{userRole}</p>
            </div>
            <Button
              onClick={handleSignOut}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Render dashboard based on selected view */}
      {view === 'manager' ? <ManagerPerformanceDashboard /> : <RepPerformanceDashboard />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
