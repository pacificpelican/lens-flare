import React, { useState, useEffect } from 'react';
import apiClient from '../services/api.js';
import { Button } from './Button.js';
import './SettingsDialog.css';

interface SystemInfo {
  database: { type: string };
  ai: { enabled: boolean; provider: string; model: string };
  php: { available: boolean };
  environment: string;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'about' | 'privacy' | 'credits' | 'debug';

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'debug' && !systemInfo) {
      loadSystemInfo();
    }
  }, [isOpen, activeTab]);

  const loadSystemInfo = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: SystemInfo }>(
        '/api/system-info'
      );
      setSystemInfo((response as any).data);
    } catch (error) {
      console.error('Failed to load system info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-dialog-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            Terms
          </button>
          <button
            className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy
          </button>
          <button
            className={`settings-tab ${activeTab === 'credits' ? 'active' : ''}`}
            onClick={() => setActiveTab('credits')}
          >
            Credits
          </button>
          <button
            className={`settings-tab ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            Debug
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'about' && (
            <div className="settings-tab-content">
              <h3>Terms of Service</h3>
              <p>
                Lens Flare is a personal photo archiving and editing tool. By using this application, you agree to:
              </p>
              <ul>
                <li>Store your photos on your own infrastructure or approved cloud services</li>
                <li>Maintain backups of important photos</li>
                <li>Use this tool in accordance with applicable laws and regulations</li>
                <li>Respect the intellectual property rights of others</li>
              </ul>
              <p>
                <strong>Disclaimer:</strong> This software is provided "as-is" without warranty. The developers are not
                responsible for data loss or corruption.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="settings-tab-content">
              <h3>Privacy Policy</h3>
              <p>
                <strong>Data Collection:</strong> Lens Flare stores all your photos and metadata locally or on your
                configured server. No data is collected by third parties unless you explicitly configure external AI
                services.
              </p>
              <p>
                <strong>AI Processing:</strong> If AI descriptions are enabled, your photos are processed by:
              </p>
              <ul>
                <li>
                  <strong>Local (Ollama):</strong> Photos are processed entirely on your machine. No data leaves your
                  system.
                </li>
                <li>
                  <strong>Cloud Services:</strong> If you configure cloud AI, photos may be sent to external services.
                  Review their privacy policies.
                </li>
              </ul>
              <p>
                <strong>Account Data:</strong> Your email and authentication tokens are stored securely. Passwords are
                hashed using bcrypt.
              </p>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="settings-tab-content">
              <h3>Credits</h3>
              <p>
                <strong>Created by:</strong>{' '}
                <a href="https://danieljmckeown.com" target="_blank" rel="noopener noreferrer">
                  Daniel McKeown
                </a>
              </p>
              <p>
                <strong>Built with:</strong>
              </p>
              <ul>
                <li>React - UI Framework</li>
                <li>Express.js - Backend Server</li>
                <li>Sharp - Image Processing</li>
                <li>SQLite / MySQL - Database</li>
                <li>Ollama - Local AI (optional)</li>
                <li>JWT - Authentication</li>
              </ul>
              <p>
                <strong>Version:</strong> 0.1.0
              </p>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="settings-tab-content">
              <h3>Debug Information</h3>
              {loading ? (
                <p>Loading system info...</p>
              ) : systemInfo ? (
                <div className="debug-info">
                  <div className="debug-section">
                    <h4>Database</h4>
                    <div className="debug-item">
                      <span className="debug-key">Type:</span>
                      <span className="debug-value">{systemInfo.database.type}</span>
                    </div>
                  </div>

                  <div className="debug-section">
                    <h4>AI Settings</h4>
                    <div className="debug-item">
                      <span className="debug-key">Enabled:</span>
                      <span className="debug-value">{systemInfo.ai.enabled ? '✓ Yes' : '✗ No'}</span>
                    </div>
                    <div className="debug-item">
                      <span className="debug-key">Provider:</span>
                      <span className="debug-value">{systemInfo.ai.provider}</span>
                    </div>
                    <div className="debug-item">
                      <span className="debug-key">Model:</span>
                      <span className="debug-value">{systemInfo.ai.model}</span>
                    </div>
                  </div>

                  <div className="debug-section">
                    <h4>Environment</h4>
                    <div className="debug-item">
                      <span className="debug-key">Node Env:</span>
                      <span className="debug-value">{systemInfo.environment}</span>
                    </div>
                    <div className="debug-item">
                      <span className="debug-key">PHP:</span>
                      <span className="debug-value">{systemInfo.php.available ? '✓ Available' : '✗ Not Available'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Failed to load system information</p>
              )}
            </div>
          )}
        </div>

        <div className="settings-footer">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
