/**
 * Audit logging for admin actions
 * Tracks important security events and admin activities
 */

class AuditLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs
  }

  log(action, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId()
    };

    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Store in localStorage for persistence
    this.saveLogs();
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit Log:', logEntry);
    }
  }

  getSessionId() {
    try {
      const sessionData = localStorage.getItem('admin_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.sessionId || 'unknown';
      }
    } catch (error) {
      console.error('Error getting session ID:', error);
    }
    return 'unknown';
  }

  saveLogs() {
    try {
      localStorage.setItem('audit_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Error saving audit logs:', error);
    }
  }

  loadLogs() {
    try {
      const storedLogs = localStorage.getItem('audit_logs');
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  }

  getLogs(filter = {}) {
    let filteredLogs = [...this.logs];

    if (filter.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filter.action);
    }

    if (filter.startDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= new Date(filter.startDate)
      );
    }

    if (filter.endDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= new Date(filter.endDate)
      );
    }

    return filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('audit_logs');
  }

  // Specific logging methods for common actions
  logLogin(success, username) {
    this.log('LOGIN_ATTEMPT', {
      success,
      username,
      ip: 'client-side' // Note: Real IP would come from server
    });
  }

  logFileUpload(filename, success, error = null) {
    this.log('FILE_UPLOAD', {
      filename,
      success,
      error: error ? error.message : null
    });
  }

  logFileDelete(filename, success) {
    this.log('FILE_DELETE', {
      filename,
      success
    });
  }

  logFileStatusChange(filename, oldStatus, newStatus) {
    this.log('FILE_STATUS_CHANGE', {
      filename,
      oldStatus,
      newStatus
    });
  }

  logMetadataUpdate(filename, changes) {
    this.log('METADATA_UPDATE', {
      filename,
      changes
    });
  }

  logSecurityEvent(event, details) {
    this.log('SECURITY_EVENT', {
      event,
      ...details
    });
  }

  logSessionExpiry() {
    this.log('SESSION_EXPIRY', {
      reason: 'timeout'
    });
  }
}

// Create a singleton instance
const auditLogger = new AuditLogger();

// Load existing logs on initialization
auditLogger.loadLogs();

export default auditLogger;
