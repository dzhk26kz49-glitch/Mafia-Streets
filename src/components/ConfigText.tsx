import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface ConfigTextProps {
  configKey: string;
  fallback: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
}

export const ConfigText: React.FC<ConfigTextProps> = ({ 
  configKey, 
  fallback, 
  className = '', 
  as: Component = 'span' 
}) => {
  const { globalSettings } = useAuthStore();
  
  const text = globalSettings?.texts?.[configKey] || fallback;
  
  return (
    <Component className={className}>
      {text}
    </Component>
  );
};
