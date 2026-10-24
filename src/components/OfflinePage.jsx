import { RefreshCw, WifiOff } from 'lucide-react';
import '../styles/offline.css';

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-card">
        <div className="offline-icon" aria-hidden="true">
          <WifiOff size={34} strokeWidth={1.7} />
        </div>
        <p className="offline-eyebrow">MYTHICHQ</p>
        <h1>You’re offline</h1>
        <p className="offline-message">
          We can’t reach the network right now. Check your connection and try again.
        </p>
        <button className="offline-retry" onClick={() => window.location.reload()} type="button">
          <RefreshCw size={17} aria-hidden="true" />
          Try again
        </button>
        <p className="offline-hint">This page will return to normal as soon as you’re back online.</p>
      </div>
    </main>
  );
}
