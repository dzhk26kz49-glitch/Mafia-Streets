import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  featureKey, 
  children, 
  fallback = null 
}) => {
  const { globalSettings, profile } = useAuthStore();
  
  // Admin bypasses feature gates
  if (profile?.role === 'Admin') return <>{children}</>;
  
  const isEnabled = globalSettings?.features?.[featureKey] ?? true;
  
  if (!isEnabled) return <>{fallback}</>;
  
  return <>{children}</>;
};
