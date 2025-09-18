import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Provider } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import img from "../Logo.jpg";

const SupabaseAuth: React.FC = () => {
  const {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithProvider,
    signOut,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    console.log("SupabaseAuth component mounted");
    console.log("Environment variables:", {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    });

    // Test Supabase connection
    const testSupabase = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("Supabase session test:", { data, error });
      } catch (err) {
        console.error("Supabase connection error:", err);
      }
    };

    testSupabase();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        alert("Check your email for verification link!");
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: Provider) => {
    console.log(`🚀 Starting ${provider} OAuth sign in`);
    setError("");
    setAuthLoading(true);

    try {
      console.log("📋 Supabase client:", supabase);
      console.log("🔑 Provider:", provider);
      console.log("🌐 Current URL:", window.location.href);
      console.log(
        "🔄 Redirect URL will be:",
        `${window.location.origin}/auth/callback`
      );

      const result = await signInWithProvider(provider);
      console.log("✅ OAuth sign in result:", result);
      console.log("🔗 Should redirect to OAuth provider now...");

      // Don't set loading to false here as the redirect should happen
      // If we reach this point without redirect, there might be an issue
      setTimeout(() => {
        console.log(
          "⚠️ No redirect happened after 2 seconds - this might indicate an OAuth configuration issue"
        );
        console.log("Result:", result);
        // If we're still here after 2 seconds, something might be wrong
        setError(
          `OAuth redirect didn't happen. Check Supabase OAuth configuration.`
        );
        setAuthLoading(false);
      }, 2000);
    } catch (error: any) {
      console.error("❌ OAuth sign in error:", error);
      setError(`OAuth Error: ${error.message}`);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                EmailMyBoost Dashboard
              </h1>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>

            {/* User Profile */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3">User Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Provider
                  </label>
                  <p className="text-gray-900">
                    {user.app_metadata?.provider || "email"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    User ID
                  </label>
                  <p className="text-gray-900 text-sm font-mono">{user.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created
                  </label>
                  <p className="text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3 text-green-800">
                ✅ Authentication Successful
              </h2>
              <div className="space-y-2 text-sm text-green-700">
                <p>
                  <strong>Status:</strong> Authenticated with Supabase
                </p>
                <p>
                  <strong>Session:</strong> Active and managed automatically
                </p>
                <p>
                  <strong>Token:</strong> JWT handled by Supabase SDK
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img src={img} alt="EmailMyBoost" className="h-32 mx-auto" />
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🚀 Google OAuth button clicked");
                handleOAuthSignIn("google");
              }}
              disabled={authLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {authLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleOAuthSignIn("azure");
              }}
              disabled={authLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"
                />
              </svg>
              {authLoading ? "Connecting..." : "Continue with Microsoft"}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={authLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {authLoading
                  ? "Processing..."
                  : isSignUp
                  ? "Sign up"
                  : "Sign in"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Debug Section */}
          {/* <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">
              🔧 Debug Info
            </h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>
                Supabase URL:{" "}
                {import.meta.env.VITE_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
              </p>
              <p>
                Anon Key:{" "}
                {import.meta.env.VITE_SUPABASE_ANON_KEY
                  ? "✅ Set"
                  : "❌ Missing"}
              </p>
              <p>Check browser console for more details</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const { data, error } = await supabase.auth.getUser();
                  console.log("Supabase test result:", { data, error });
                  alert(
                    `Supabase test: ${
                      error ? "Error - " + error.message : "Success!"
                    }`
                  );
                } catch (err) {
                  console.error("Supabase test error:", err);
                  alert("Supabase test failed: " + err);
                }
              }}
              className="mt-2 px-3 py-1 text-xs bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
            >
              Test Supabase Connection
            </button>
          </div> */}

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>🔒 Secure authentication powered by Supabase</p>
            <p>✉️ OAuth integration with Google and Microsoft</p>
            <p className="mt-2 text-yellow-600">
              ⚠️ If buttons don't work, configure OAuth providers in Supabase
              dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseAuth;
