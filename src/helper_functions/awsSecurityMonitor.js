/**
 * AWS Security Monitoring
 * Tracks AWS operations for security analysis
 */

class AWSSecurityMonitor {
  constructor() {
    this.operations = [];
    this.suspiciousPatterns = [];
    this.maxOperations = 1000;
  }

  logOperation(operation, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId()
    };

    this.operations.push(logEntry);
    
    // Keep only recent operations
    if (this.operations.length > this.maxOperations) {
      this.operations = this.operations.slice(-this.maxOperations);
    }

    // Check for suspicious patterns
    this.checkSuspiciousActivity(logEntry);
    
    // Store in localStorage
    this.saveOperations();
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

  checkSuspiciousActivity(logEntry) {
    const suspiciousPatterns = [
      {
        name: 'RAPID_UPLOADS',
        check: () => this.checkRapidUploads(),
        severity: 'HIGH'
      },
      {
        name: 'LARGE_FILES',
        check: () => this.checkLargeFiles(logEntry),
        severity: 'MEDIUM'
      },
      {
        name: 'UNUSUAL_TIMES',
        check: () => this.checkUnusualTimes(logEntry),
        severity: 'LOW'
      },
      {
        name: 'FAILED_OPERATIONS',
        check: () => this.checkFailedOperations(),
        severity: 'MEDIUM'
      }
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.check()) {
        this.recordSuspiciousActivity(pattern.name, pattern.severity, logEntry);
      }
    });
  }

  checkRapidUploads() {
    const recentUploads = this.operations
      .filter(op => op.operation === 'FILE_UPLOAD' && op.details.success)
      .filter(op => Date.now() - new Date(op.timestamp).getTime() < 60000); // Last minute
    
    return recentUploads.length > 10; // More than 10 uploads per minute
  }

  checkLargeFiles(logEntry) {
    if (logEntry.operation === 'FILE_UPLOAD' && logEntry.details.fileSize) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      return logEntry.details.fileSize > maxSize;
    }
    return false;
  }

  checkUnusualTimes(logEntry) {
    const hour = new Date(logEntry.timestamp).getHours();
    // Flag operations between 2 AM and 5 AM
    return hour >= 2 && hour <= 5;
  }

  checkFailedOperations() {
    const recentFailures = this.operations
      .filter(op => op.details.success === false)
      .filter(op => Date.now() - new Date(op.timestamp).getTime() < 300000); // Last 5 minutes
    
    return recentFailures.length > 5; // More than 5 failures in 5 minutes
  }

  recordSuspiciousActivity(pattern, severity, logEntry) {
    const suspiciousActivity = {
      timestamp: new Date().toISOString(),
      pattern,
      severity,
      logEntry,
      action: 'REVIEW_REQUIRED'
    };

    this.suspiciousPatterns.push(suspiciousActivity);
    
    // Alert in console for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 Suspicious AWS Activity Detected:', suspiciousActivity);
    }

    // Store suspicious activities
    this.saveSuspiciousActivities();
  }

  saveOperations() {
    try {
      localStorage.setItem('aws_operations', JSON.stringify(this.operations));
    } catch (error) {
      console.error('Error saving AWS operations:', error);
    }
  }

  saveSuspiciousActivities() {
    try {
      localStorage.setItem('aws_suspicious_activities', JSON.stringify(this.suspiciousPatterns));
    } catch (error) {
      console.error('Error saving suspicious activities:', error);
    }
  }

  loadOperations() {
    try {
      const storedOps = localStorage.getItem('aws_operations');
      if (storedOps) {
        this.operations = JSON.parse(storedOps);
      }

      const storedSuspicious = localStorage.getItem('aws_suspicious_activities');
      if (storedSuspicious) {
        this.suspiciousPatterns = JSON.parse(storedSuspicious);
      }
    } catch (error) {
      console.error('Error loading AWS operations:', error);
    }
  }

  getSecurityReport() {
    const now = Date.now();
    const last24Hours = this.operations.filter(op => 
      now - new Date(op.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    const uploads = last24Hours.filter(op => op.operation === 'FILE_UPLOAD');
    const deletes = last24Hours.filter(op => op.operation === 'FILE_DELETE');
    const failed = last24Hours.filter(op => op.details.success === false);

    return {
      totalOperations: last24Hours.length,
      uploads: uploads.length,
      deletes: deletes.length,
      failedOperations: failed.length,
      suspiciousActivities: this.suspiciousPatterns.length,
      lastActivity: last24Hours.length > 0 ? last24Hours[last24Hours.length - 1].timestamp : null
    };
  }

  clearOldData() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    this.operations = this.operations.filter(op => 
      new Date(op.timestamp).getTime() > cutoff
    );
    this.saveOperations();
  }
}

// Create singleton instance
const awsSecurityMonitor = new AWSSecurityMonitor();

// Load existing data
awsSecurityMonitor.loadOperations();

export default awsSecurityMonitor;
