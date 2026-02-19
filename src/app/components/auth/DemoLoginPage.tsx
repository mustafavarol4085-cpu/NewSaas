import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from './AuthProvider';
import { Lock, User, Users, Mail, KeyRound } from 'lucide-react';

export function DemoLoginPage() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'rep' | 'manager' | 'admin'>('rep');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');

  const handleRoleChange = (role: 'rep' | 'manager' | 'admin') => {
    setSelectedRole(role);
    setEmail(
      role === 'rep'
        ? ''
        : role === 'manager'
        ? 'manager@example.com'
        : 'admin@example.com'
    );
    setPassword('demo123');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
    } catch (err: any) {  
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1935] to-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-cyan-500/40 animate-pulse">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Multiplicity AI
          </h1>
          <p className="text-gray-400 text-lg">Sales Performance Platform</p>
        </div>

        {/* Auth Card */}
        <Card className="p-8 border border-cyan-500/20 bg-[#1e293b]/95 backdrop-blur-sm shadow-2xl shadow-cyan-500/10">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection Tabs */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleChange('rep')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    selectedRole === 'rep'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Sales Rep</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('manager')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    selectedRole === 'manager'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Manager</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    selectedRole === 'admin'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Role Description */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-gray-300 text-center">
                {selectedRole === 'rep' ? (
                  <>
                    <span className="font-semibold text-blue-400">Rep Access:</span> View your own performance metrics and call analytics
                  </>
                ) : selectedRole === 'manager' ? (
                  <>
                    <span className="font-semibold text-cyan-400">Manager Access:</span> View team performance and switch between all dashboards
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-purple-400">Admin Access:</span> Full role-based access with manager + rep views
                  </>
                )}
              </p>
            </div>

            {/* Rep Selection - Only show for Rep role */}
            {selectedRole === 'rep' && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-300">
                  Select Your Name
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { name: 'Sarah Johnson', email: 'Sarah Johnson' },
                    { name: 'Tom Martinez', email: 'Tom Martinez' },
                    { name: 'Emma Rodriguez', email: 'Emma Rodriguez' }
                  ].map(rep => (
                    <button
                      key={rep.email}
                      type="button"
                      onClick={() => {
                        setEmail(rep.email);
                        setPassword('demo123');
                      }}
                      className={`flex items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        email === rep.email
                          ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30'
                          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                      }`}
                    >
                      {rep.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                <Mail className="w-4 h-4 inline mr-2" />
                {selectedRole === 'rep' ? 'Rep Name' : 'Email Address'}
              </label>
              <input
                type={selectedRole === 'rep' ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                placeholder={selectedRole === 'rep' ? 'Select a rep name above' : selectedRole === 'manager' ? 'manager@example.com' : 'admin@example.com'}
                required
              />
              {selectedRole === 'rep' && email && (
                <p className="text-xs text-gray-400 mt-1">
                  <KeyRound className="w-3 h-3 inline mr-1" />
                  Password: demo123
                </p>
              )}
              {selectedRole === 'manager' && (
                <p className="text-xs text-gray-400 mt-1">
                  <KeyRound className="w-3 h-3 inline mr-1" />
                  Use: <span className="font-mono">manager@example.com</span> with password <span className="font-mono">demo123</span>
                </p>
              )}
              {selectedRole === 'admin' && (
                <p className="text-xs text-gray-400 mt-1">
                  <KeyRound className="w-3 h-3 inline mr-1" />
                  Use: <span className="font-mono">admin@example.com</span> with password <span className="font-mono">demo123</span>
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                <KeyRound className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span className="text-red-400">⚠</span>
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold py-4 rounded-lg transition-all shadow-lg ${
                selectedRole === 'rep'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-500/30'
                  : selectedRole === 'manager'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white shadow-cyan-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-purple-500/30'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5" />
                  <span>Sign In as {selectedRole === 'rep' ? 'Sales Rep' : selectedRole === 'manager' ? 'Manager' : 'Admin'}</span>
                </div>
              )}
            </Button>

            {/* Demo Info */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Demo credentials are pre-filled • Click role to switch accounts
              </p>
            </div>
          </form>
        </Card>

        {/* Footer Note */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Secure authentication powered by Supabase
          </p>
          <p className="text-xs text-gray-600">
            © 2026 Multiplicity AI • All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
