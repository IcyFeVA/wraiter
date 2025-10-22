import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const AppSettings: React.FC = () => {
  const [startOnBoot, setStartOnBoot] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedStartOnBoot = localStorage.getItem('start_on_boot') === 'true';
    setStartOnBoot(savedStartOnBoot);
  }, []);

  const handleStartOnBootChange = async (enabled: boolean) => {
    setStartOnBoot(enabled);
    localStorage.setItem('start_on_boot', enabled.toString());
    try {
      await invoke('set_autostart', { enable: enabled });
    } catch (error) {
      console.error('Failed to set autostart:', error);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-section">
        <h3 className="section-title">App Settings</h3>
        <div className="setting-row">
          <label className="setting-label">
            Start on OS Boot:
          </label>
          <div className="select-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={startOnBoot}
                onChange={(e) => handleStartOnBootChange(e.target.checked)}
                className="checkbox"
              />
              <span>Launch the app hidden on system startup.</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
