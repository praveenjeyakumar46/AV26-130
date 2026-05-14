/**
 * Backend Status Diagnostic Component
 * Use this to debug backend connection issues
 */
import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faCheckCircle, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export const BackendStatus = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    const check = async () => {
      setStatus('checking');
      setDetails('Checking backend connection...');
      
      try {
        const healthy = await checkHealth();
        if (healthy) {
          setStatus('connected');
          setDetails('✅ Backend is connected and healthy');
        } else {
          setStatus('disconnected');
          setDetails('❌ Backend is not accessible. Make sure the backend server is running on port 3000.');
        }
      } catch (error) {
        setStatus('disconnected');
        setDetails(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = () => {
    switch (status) {
      case 'checking':
        return <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500" />;
      case 'connected':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'disconnected':
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="font-semibold">Backend Status</span>
      </div>
      <p className="text-sm text-muted-foreground">{details}</p>
      {status === 'disconnected' && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>To start the backend:</p>
          <code className="block bg-muted p-2 rounded mt-1">cd backend && npm run dev</code>
        </div>
      )}
    </div>
  );
};
