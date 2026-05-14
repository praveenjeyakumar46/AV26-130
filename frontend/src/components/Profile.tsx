import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faArrowRightFromBracket, faUser, faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const Profile = () => {
  const { t } = useTranslation('common');
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUsername(localStorage.getItem('auth_user'));
      setToken(localStorage.getItem('auth_token'));
    } catch {
      setUsername(null);
      setToken(null);
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    } catch {
      // ignore storage errors
    }
    setUsername(null);
    setToken(null);
  };

  return (
    <div className="min-h-screen pt-20 pb-16 text-foreground">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8 flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-white">
            <FontAwesomeIcon icon={faUserShield} className="text-xl" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
            <p className="text-muted-foreground">{t('profile.publicAccess', { defaultValue: 'Public access enabled. Login is not required.' })}</p>
          </div>
        </div>

        {token ? (
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profile.signedInAs', { defaultValue: 'Signed in as' })}</p>
                <p className="font-semibold">{username}</p>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 border border-border/60">
              <p className="text-xs text-muted-foreground mb-2">{t('profile.token', { defaultValue: 'Token' })}</p>
              <p className="text-sm break-all">{token}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors duration-200"
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="rotate-180" />
              <span>{t('profile.signOut', { defaultValue: 'Sign out' })}</span>
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted text-foreground flex items-center justify-center">
                <FontAwesomeIcon icon={faIdBadge} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profile.noActiveSession', { defaultValue: 'No active session' })}</p>
                <p className="text-sm text-muted-foreground">{t('profile.loginDisabled', { defaultValue: 'Login is disabled; the site is open.' })}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

