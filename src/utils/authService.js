// @ts-nocheck
// DEPRECATED: This file is replaced by Supabase authentication
// Use useAuth hook and Supabase instead of this legacy service
// Kept for backward compatibility only

// API base URL
const API_BASE_URL = import.meta.env.DEV ? "http://localhost:3000/api" : "/api";

// Auth API endpoints
export const authAPI = {
  // Register new user
  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Store token in localStorage
      if (data.data.token) {
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("userProfile", JSON.stringify(data.data.user));
      }

      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  // Register OAuth user (null password)
  oauthRegister: async (username, email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/oauth-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OAuth registration failed");
      }

      return data;
    } catch (error) {
      console.error("OAuth registration error:", error);
      throw error;
    }
  },

  // Login OAuth user (null password check)
  oauthLogin: async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/oauth-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OAuth login failed");
      }

      return data;
    } catch (error) {
      console.error("OAuth login error:", error);
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token in localStorage
      if (data.data.token) {
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("userProfile", JSON.stringify(data.data.user));
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Verify token
  verifyToken: async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Token verification failed");
      }

      return data;
    } catch (error) {
      console.error("Token verification error:", error);
      // Clear invalid token
      localStorage.removeItem("authToken");
      localStorage.removeItem("userProfile");
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch user");
      }

      return data;
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("registeredGmailAccount"); // Clear old storage format
  },

  // Get stored user profile
  getStoredUser: () => {
    try {
      const userProfile = localStorage.getItem("userProfile");
      return userProfile ? JSON.parse(userProfile) : null;
    } catch (error) {
      console.error("Error parsing stored user profile:", error);
      return null;
    }
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem("authToken");
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem("authToken");
    const user = authAPI.getStoredUser();
    return !!(token && user);
  },
};

// Helper function to handle API errors
export const handleAPIError = (error) => {
  if (error.message) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
};

// Helper function to validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate password strength
export const validatePassword = (password) => {
  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }
  return null;
};

export default authAPI;
