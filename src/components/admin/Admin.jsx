import React, { useState } from "react";
import loginImg from "../assets/loginPicture.jpeg";
import apiClient from "../../services/apiClient";
import sessionManager from "../../helper_functions/sessionManager";
import { useNavigate } from "react-router-dom";

function Admin({ authenticated }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [plainPassword, setPlainPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Input validation
    if (!username.trim() || !plainPassword.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    if (username.length > 100 || plainPassword.length > 100) {
      setError("Username and password must be less than 100 characters.");
      return;
    }

    try {
      // Use secure API authentication
      const response = await apiClient.login(username, plainPassword);
      
      if (response.success) {
        sessionManager.createSession();
        authenticated(true);
        navigate("/adminDashboard");
      } else {
        setError(response.error || "Invalid username or password.");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError("Authentication failed. Please try again.");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 h-screen w-full">
        <div className="hidden sm:block">
          <img
            src={loginImg}
            alt="Log in"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="bg-gray-800 flex flex-col justify-center">
          <form
            onSubmit={handleLogin}
            className="max-w-[400px] w-full mx-auto bg-gray-900 p-8 rounded-lg"
            aria-label="Admin login form"
          >
            <h2 className="text-4xl dark:text-white font-bold text-center mb-6">
              LOG IN
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <div className="flex flex-col text-gray-400 py-2">
              <label htmlFor="username" className="mb-2 font-medium">
                User Name:
              </label>
              <input
                type="text"
                name="username"
                id="username"
                className="rounded-lg bg-gray-700 p-3 focus:border-blue-500 focus:bg-gray-800 focus:outline-none transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="flex flex-col text-gray-400 py-2">
              <label htmlFor="password" className="mb-2 font-medium">
                Password:
              </label>
              <input
                type="password"
                name="password"
                id="password"
                className="rounded-lg bg-gray-700 p-3 focus:border-blue-500 focus:bg-gray-800 focus:outline-none transition-colors"
                value={plainPassword}
                onChange={(e) => setPlainPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              className="w-full mt-6 py-3 bg-teal-500 shadow-lg shadow-teal-500/50 hover:shadow-teal-500/40 text-white font-semibold rounded-lg transition-all hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              LOG IN
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Admin;
