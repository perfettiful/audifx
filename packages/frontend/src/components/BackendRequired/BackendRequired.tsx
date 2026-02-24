import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useBackendStatus } from '../../hooks/useBackendStatus';
import styles from './BackendRequired.module.css';

interface BackendRequiredProps {
  children: ReactNode;
  featureName: string;
}

export function BackendRequired({ children, featureName }: BackendRequiredProps) {
  const status = useBackendStatus();

  if (status === 'checking') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner} />
          <p className={styles.message}>Connecting to backend...</p>
        </div>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.icon}>⚠️</div>
          <h2 className={styles.title}>{featureName} Unavailable</h2>
          <p className={styles.message}>
            This feature requires the AudiFX backend server, which is not currently running.
          </p>

          <div className={styles.instructions}>
            <p className={styles.label}>To start the backend:</p>
            <pre className={styles.code}>
{`cd packages/backend
source venv/bin/activate
./start.sh`}
            </pre>
          </div>

          <p className={styles.hint}>
            The Audio Effects tool works without the backend.
          </p>

          <div className={styles.actions}>
            <Link to="/effects" className={styles.effectsLink}>
              Go to Audio Effects
            </Link>
            <Link to="/" className={styles.homeLink}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
