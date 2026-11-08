import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <p>
        Powered by{' '}
        <a href="https://github.com/pacificpelican/lens-flare" target="_blank" rel="noopener noreferrer">
          Lens Flare
        </a>
      </p>
    </footer>
  );
};
