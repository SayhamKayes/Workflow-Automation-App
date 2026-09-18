import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  GoogleSpreadsheetInfo,
  findExistingSpreadsheet,
  createPersonalSpreadsheet,
  DEFAULT_WORKSHEET_NAME,
  fetchUserSignatureFromDrive,
} from '../services/googleSheetsService';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  provider: 'google' | 'demo';
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  spreadsheetInfo: GoogleSpreadsheetInfo | null;
  isInitializingSpreadsheet: boolean;
  googleClientId: string;
  isGoogleConfigured: boolean;
  loginWithGoogle: () => void;
  loginAsDemo: (customUser?: Partial<UserProfile>) => void;
  logout: () => void;
  refreshSheetConnection: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'workflow_auth_user';
const TOKEN_STORAGE_KEY = 'workflow_auth_token';
const SHEET_STORAGE_KEY = 'workflow_user_sheet_info';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define global types for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: number;
            }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const googleClientId =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleConfigured = Boolean(googleClientId && googleClientId.trim() !== '');

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  });

  const [spreadsheetInfo, setSpreadsheetInfo] = useState<GoogleSpreadsheetInfo | null>(() => {
    try {
      const saved = localStorage.getItem(SHEET_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isInitializingSpreadsheet, setIsInitializingSpreadsheet] = useState(false);
  const [tokenClient, setTokenClient] = useState<{ requestAccessToken: () => void } | null>(null);

  // 1. Dynamically load Google Identity Services script
  useEffect(() => {
    if (!isGoogleConfigured) return;

    const existingScript = document.getElementById('google-gsi-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeTokenClient;
      document.body.appendChild(script);
    } else if (window.google?.accounts?.oauth2) {
      initializeTokenClient();
    }
  }, [isGoogleConfigured, googleClientId]);

  // 2. Setup token client when script is ready
  const initializeTokenClient = useCallback(() => {
    if (!window.google?.accounts?.oauth2 || !googleClientId) return;

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope:
          'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async response => {
          if (response.error || !response.access_token) {
            console.error('Google OAuth token error:', response.error);
            return;
          }

          const token = response.access_token;
          setAccessToken(token);
          localStorage.setItem(TOKEN_STORAGE_KEY, token);

          // Fetch user profile
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const profile = await userRes.json();
            const authedUser: UserProfile = {
              id: profile.sub,
              name: profile.name || 'Google User',
              email: profile.email,
              picture: profile.picture,
              provider: 'google',
            };
            setUser(authedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authedUser));

            // Setup or find personal spreadsheet
            await connectUserSpreadsheet(token);

            // Restore user's saved signature from Google Drive if it exists
            try {
              const driveSig = await fetchUserSignatureFromDrive(token, profile.email, profile.name);
              if (driveSig?.dataUrl) {
                localStorage.setItem('workflow_user_signature', driveSig.dataUrl);
                if (driveSig.viewUrl) {
                  localStorage.setItem('workflow_user_signature_url', driveSig.viewUrl);
                }
                window.dispatchEvent(new Event('workflow_signature_updated'));
              }
            } catch (sigErr) {
              console.warn('Could not auto-restore signature from Drive on login:', sigErr);
            }
          } catch (err) {
            console.error('Failed to fetch user profile:', err);
          }
        },
      });

      setTokenClient(client);
    } catch (err) {
      console.error('Error initializing Google token client:', err);
    }
  }, [googleClientId]);

  // Auto-restore signature from Drive on app load if user is logged in and not in local storage
  useEffect(() => {
    if (accessToken && user?.provider === 'google') {
      const cached = localStorage.getItem('workflow_user_signature');
      if (!cached) {
        fetchUserSignatureFromDrive(accessToken, user.email, user.name)
          .then(driveSig => {
            if (driveSig?.dataUrl) {
              localStorage.setItem('workflow_user_signature', driveSig.dataUrl);
              if (driveSig.viewUrl) {
                localStorage.setItem('workflow_user_signature_url', driveSig.viewUrl);
              }
              window.dispatchEvent(new Event('workflow_signature_updated'));
            }
          })
          .catch(err => console.warn('Could not restore signature on mount:', err));
      }
    }
  }, [accessToken, user]);

  // Connect or create user personal spreadsheet
  const connectUserSpreadsheet = async (token: string) => {
    setIsInitializingSpreadsheet(true);
    try {
      // Look for existing sheet in user's Google Drive
      let sheet = await findExistingSpreadsheet(token);
      if (!sheet) {
        // Create new one
        sheet = await createPersonalSpreadsheet(token, [DEFAULT_WORKSHEET_NAME]);
      }
      setSpreadsheetInfo(sheet);
      localStorage.setItem(SHEET_STORAGE_KEY, JSON.stringify(sheet));
    } catch (err) {
      console.error('Could not connect spreadsheet:', err);
    } finally {
      setIsInitializingSpreadsheet(false);
    }
  };

  const refreshSheetConnection = async () => {
    if (accessToken && user?.provider === 'google') {
      await connectUserSpreadsheet(accessToken);
    }
  };

  // Google Login Trigger
  const loginWithGoogle = () => {
    if (!isGoogleConfigured) {
      alert('Google Client ID is not configured in .env.local yet. You can use the Demo / Guest login below to test!');
      return;
    }

    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      initializeTokenClient();
      setTimeout(() => {
        tokenClient?.requestAccessToken();
      }, 500);
    }
  };

  // Demo / Simulation Login
  const loginAsDemo = (customUser?: Partial<UserProfile>) => {
    const demoUser: UserProfile = {
      id: customUser?.id || `user_${Date.now()}`,
      name: customUser?.name || 'Demo User',
      email: customUser?.email || 'demo@workflow.app',
      picture:
        customUser?.picture ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      provider: 'demo',
    };

    setUser(demoUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(demoUser));

    // Simulated sheet info for demo user
    const simulatedSheet: GoogleSpreadsheetInfo = {
      id: `sheet_${demoUser.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: `${demoUser.name}'s Workflow Sheet (Simulator)`,
      url: 'https://docs.google.com/spreadsheets/',
    };
    setSpreadsheetInfo(simulatedSheet);
    localStorage.setItem(SHEET_STORAGE_KEY, JSON.stringify(simulatedSheet));
  };

  // Logout
  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setSpreadsheetInfo(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(SHEET_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        spreadsheetInfo,
        isInitializingSpreadsheet,
        googleClientId,
        isGoogleConfigured,
        loginWithGoogle,
        loginAsDemo,
        logout,
        refreshSheetConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
