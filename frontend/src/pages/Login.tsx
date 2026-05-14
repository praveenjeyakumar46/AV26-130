import { useMemo, useState } from 'react';
import { loginUser, signupUser } from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUser, faArrowRight, faShieldHalved, faEnvelope, faUserPlus } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('demo@example.com');
  const [password, setPassword] = useState('changeme123');
  const [name, setName] = useState('Demo User');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const headline = useMemo(
    () => (mode === 'login' ? 'Sign in to continue' : 'Create your account'),
    [mode],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToken(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await loginUser(username, password);
        setToken(result.access_token);
        localStorage.setItem('auth_token', result.access_token);
        localStorage.setItem('auth_user', result.username);
      } else {
        const result = await signupUser(name, username, password);
        setToken(result.access_token);
        localStorage.setItem('auth_token', result.access_token);
        localStorage.setItem('auth_user', result.username);
        localStorage.setItem('auth_name', result.name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      const friendly = message.includes('Invalid credentials')
        ? 'Invalid username or password'
        : message;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#3E2F5B]/10 via-background to-[#E94560]/5 text-foreground px-4">
      <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-8 bg-card border border-border rounded-2xl shadow-2xl p-10">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-white">
              <FontAwesomeIcon icon={faShieldHalved} className="text-xl" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Secure Access</p>
              <h1 className="text-3xl font-bold">{headline}</h1>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            This is a demo auth flow wired to the FastAPI backend. Tokens are stored locally in this browser for preview purposes only.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Demo login</p>
              <p className="font-semibold text-foreground">demo@example.com</p>
              <p className="text-muted-foreground">Password: changeme123</p>
              <p className="text-xs text-muted-foreground mt-2">Endpoint: /auth/login</p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Demo signup</p>
              <p className="font-semibold text-foreground">Any email + password</p>
              <p className="text-muted-foreground">Password min 8 chars</p>
              <p className="text-xs text-muted-foreground mt-2">Endpoint: /auth/signup</p>
            </div>
          </div>
          <div className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
            Royal Aurora • Secure UI • Quick demo auth
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 bg-muted rounded-lg p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-md transition-all ${mode === 'login' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 rounded-md transition-all ${mode === 'signup' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
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
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
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
            <div className="space-y-2">
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
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {token && (
              <div className="text-sm text-success bg-success/10 border border-success/30 rounded-lg p-3 break-all">
                Logged in! Token: {token}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg gradient-primary text-white font-semibold shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform flex items-center justify-center space-x-2 disabled:opacity-70"
            >
              <span>{loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : mode === 'login' ? 'Sign in' : 'Create account'}</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
