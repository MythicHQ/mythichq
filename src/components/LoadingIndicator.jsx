import React from 'react';
import { Miyagi } from 'ldrs/react';
import 'ldrs/react/Miyagi.css';

const LoadingIndicator = ({ label = 'Loading...', size = '35', className = '' }) => (
  <div className={`loading-indicator ${className}`.trim()} role="status" aria-live="polite">
    <Miyagi size={size} stroke="3.5" speed="0.9" color="var(--accent-crimson-bright)" />
    <span>{label}</span>
  </div>
);

export default LoadingIndicator;
