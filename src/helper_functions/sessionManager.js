/**
 * Simple session management for admin authentication
 * Handles session timeout and security
 */

class SessionManager {
  constructor() {
    this.sessionKey = 'admin_session';
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastActivityKey = 'last_activity';
  }

  createSession() {
    const sessionData = {
      authenticated: true,
      timestamp: Date.now(),
      sessionId: this.generateSessionId()
    };
    
    localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    localStorage.setItem(this.lastActivityKey, Date.now().toString());
    
    // Set up activity tracking
    this.setupActivityTracking();
    
    return sessionData;
  }

  isSessionValid() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      const lastActivity = localStorage.getItem(this.lastActivityKey);
      
      if (!sessionData || !lastActivity) {
        return false;
      }

      JSON.parse(sessionData); // validate JSON is well-formed
      const now = Date.now();
      const timeSinceActivity = now - parseInt(lastActivity);

      // Check if session has expired
      if (timeSinceActivity > this.sessionTimeout) {
        this.clearSession();
        return false;
      }

      // Update last activity
      localStorage.setItem(this.lastActivityKey, now.toString());
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      this.clearSession();
      return false;
    }
  }

  clearSession() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.lastActivityKey);
    this.removeActivityTracking();
  }

  getSessionInfo() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) return null;
      
      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  setupActivityTracking() {
    // Track user activity to extend session
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const updateActivity = () => {
      localStorage.setItem(this.lastActivityKey, Date.now().toString());
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Store event listeners for cleanup
    this.activityEvents = activityEvents;
    this.updateActivity = updateActivity;
  }

  removeActivityTracking() {
    if (this.activityEvents && this.updateActivity) {
      this.activityEvents.forEach(event => {
        document.removeEventListener(event, this.updateActivity, true);
      });
    }
  }

  getRemainingTime() {
    const lastActivity = localStorage.getItem(this.lastActivityKey);
    if (!lastActivity) return 0;
    
    const timeSinceActivity = Date.now() - parseInt(lastActivity);
    const remaining = this.sessionTimeout - timeSinceActivity;
    
    return Math.max(0, Math.ceil(remaining / 60000)); // Return minutes
  }

  extendSession() {
    if (this.isSessionValid()) {
      localStorage.setItem(this.lastActivityKey, Date.now().toString());
      return true;
    }
    return false;
  }
}

// Create a singleton instance
const sessionManager = new SessionManager();

export default sessionManager;
