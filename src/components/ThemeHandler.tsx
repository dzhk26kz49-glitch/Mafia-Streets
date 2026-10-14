import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const ThemeHandler: React.FC = () => {
  const { globalSettings } = useAuthStore();

  useEffect(() => {
    if (globalSettings?.theme) {
      const { primaryColor, secondaryColor, accentColor, fontFamily } = globalSettings.theme;
      
      const root = document.documentElement;
      if (primaryColor) root.style.setProperty('--primary-color', primaryColor);
      if (secondaryColor) root.style.setProperty('--secondary-color', secondaryColor);
      if (accentColor) root.style.setProperty('--accent-color', accentColor);
      
      // Update global font if provided
      if (fontFamily) {
        document.body.style.fontFamily = fontFamily;
      }
    }
  }, [globalSettings]);

  return null; // This component doesn't render anything UI-wise
};
