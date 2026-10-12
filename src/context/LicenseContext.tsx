import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ClientLicense } from '../types';
import { licenseService } from '../services/licenseService';

interface LicenseContextType {
  license: ClientLicense | null;
  isSuspended: boolean;
  suspensionReason: string;
  loading: boolean;
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [license, setLicense] = useState<ClientLicense | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLicense = async () => {
    try {
      const current = await licenseService.getCurrentLicense();
      setLicense(current);
    } catch (err) {
      console.error('Error fetching license status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicense();

    // Periodic check every 30 seconds to catch remote suspension or reactivation
    const interval = setInterval(() => {
      fetchLicense();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const isSuspended = license?.status === 'suspended';
  const suspensionReason = license?.suspension_reason || 'تم انتهاء الحصة المجانية لقاعدة البيانات';

  return (
    <LicenseContext.Provider
      value={{
        license,
        isSuspended,
        suspensionReason,
        loading,
        refreshLicense: fetchLicense
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};

export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
