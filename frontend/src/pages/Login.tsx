import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, signupUser } from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faArrowRight, faShieldHalved, faEnvelope, faUserPlus } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const headline = useMemo(
    () => (mode === 'login' ? 'Sign in to continue' : 'Create your account'),
    [mode],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await loginUser(username, password);
        localStorage.setItem('auth_token', result.access_token);
        localStorage.setItem('auth_user', result.username);
        localStorage.setItem('auth_name', result.name || result.username);
      } else {
        const result = await signupUser(name, username, password);
        localStorage.setItem('auth_token', result.access_token);
        localStorage.setItem('auth_user', result.username);
        localStorage.setItem('auth_name', result.name || name);
      }
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message.includes('Invalid credentials') ? 'Invalid email or password' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3E2F5B]/10 via-background to-[#E94560]/5 text-foreground px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-white">
            <FontAwesomeIcon icon={faShieldHalved} className="text-xl" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Nyria · Secure Access</p>
            <h1 className="text-2xl font-bold">{headline}</h1>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 bg-muted rounded-lg p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`py-2 rounded-md transition-all ${mode === 'login' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`py-2 rounded-md transition-all ${mode === 'signup' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Full name</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <FontAwesomeIcon icon={faUserPlus} />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <FontAwesomeIcon icon={faEnvelope} />
              </span>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <FontAwesomeIcon icon={faLock} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg gradient-primary text-white font-semibold shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <span>
              {loading
                ? mode === 'login' ? 'Signing in...' : 'Creating account...'
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
