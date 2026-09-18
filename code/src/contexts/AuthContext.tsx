// ============================================================
// AuthContext.tsx — Simple authentication state management
// ============================================================
// Professor explanation:
// This is a React Context that manages the user's login state.
// It stores a JWT token in localStorage (browser storage).
// In a real app, this token would come from a backend server.
// Right now we use mock login for the prototype.
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// Shape of a user object
interface User {
  name: string;
  email: string;
}

// What our auth context provides to the rest of the app
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use auth anywhere in the app
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if user was already logged in (token in localStorage)
  useEffect(() => {
    const token = localStorage.getItem("marketlens_notebook_token");
    const savedUser = localStorage.getItem("marketlens_notebook_user");

    if (token && savedUser) {
      // In a real app, we'd verify the token with the backend here
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  // ---- Login: simulate JWT auth ----
  const login = async (email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800));

    // In production, this would call: POST /api/auth/login
    // and receive a JWT token from the server.
    const mockToken = "jwt_mock_" + btoa(email + Date.now());
    const newUser: User = {
      name: email.split("@")[0],
      email,
    };

    // Store token and user — this is how JWT auth typically works on the frontend
    localStorage.setItem("marketlens_notebook_token", mockToken);
    localStorage.setItem("marketlens_notebook_user", JSON.stringify(newUser));
    setUser(newUser);
    setIsLoading(false);
    return true;
  };

  // ---- Register: create a new account ----
  const register = async (name: string, email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    // In production: POST /api/auth/register → receive JWT
    const mockToken = "jwt_mock_" + btoa(email + Date.now());
    const newUser: User = { name, email };

    localStorage.setItem("marketlens_notebook_token", mockToken);
    localStorage.setItem("marketlens_notebook_user", JSON.stringify(newUser));
    setUser(newUser);
    setIsLoading(false);
    return true;
  };

  // ---- Logout: clear stored tokens ----
  const logout = () => {
    localStorage.removeItem("marketlens_notebook_token");
    localStorage.removeItem("marketlens_notebook_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
