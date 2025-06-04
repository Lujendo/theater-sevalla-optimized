const fs = require('fs').promises;
const path = require('path');

/**
 * Security logger middleware
 * Logs security-related events to a file
 */
const securityLogger = {
  /**
   * Log a security event
   * @param {string} event - The event type
   * @param {Object} data - Additional data to log
   */
  async log(event, data = {}) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        event,
        ...data
      };
      
      const logDir = path.join(__dirname, '../logs');
      const logFile = path.join(logDir, 'security.log');
      
      // Create logs directory if it doesn't exist
      try {
        await fs.mkdir(logDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error('Error creating logs directory:', err);
        }
      }
      
      // Append to log file
      await fs.appendFile(
        logFile,
        JSON.stringify(logEntry) + '\n',
        { encoding: 'utf8' }
      );
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SECURITY] ${event}:`, data);
      }
    } catch (err) {
      console.error('Error writing to security log:', err);
    }
  },
  
  /**
   * Log authentication events
   */
  authLogger: (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(body) {
      const statusCode = res.statusCode;
      const path = req.path;
      const ip = req.ip || req.connection.remoteAddress;
      const method = req.method;
      
      // Log successful logins
      if (path === '/api/auth/login' && statusCode === 200 && method === 'POST') {
        const responseBody = typeof body === 'string' ? JSON.parse(body) : body;
        securityLogger.log('LOGIN_SUCCESS', {
          username: req.body.username,
          ip,
          userAgent: req.headers['user-agent']
        });
      }
      
      // Log failed login attempts
      if (path === '/api/auth/login' && statusCode === 401 && method === 'POST') {
        securityLogger.log('LOGIN_FAILURE', {
          username: req.body.username,
          ip,
          userAgent: req.headers['user-agent']
        });
      }
      
      // Log impersonation
      if (path.startsWith('/api/auth/impersonate/') && statusCode === 200 && method === 'POST') {
        const responseBody = typeof body === 'string' ? JSON.parse(body) : body;
        securityLogger.log('USER_IMPERSONATION', {
          adminId: req.user?.id,
          adminUsername: req.user?.username,
          targetUserId: req.params.userId,
          targetUsername: responseBody.user?.username,
          ip,
          userAgent: req.headers['user-agent']
        });
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  },
  
  /**
   * Log data modification events
   */
  dataLogger: (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(body) {
      const statusCode = res.statusCode;
      const path = req.path;
      const method = req.method;
      
      // Log equipment creation
      if (path === '/api/equipment' && statusCode === 201 && method === 'POST') {
        securityLogger.log('EQUIPMENT_CREATED', {
          userId: req.user?.id,
          username: req.user?.username,
          equipmentId: typeof body === 'string' ? JSON.parse(body).id : body.id
        });
      }
      
      // Log equipment updates
      if (path.startsWith('/api/equipment/') && statusCode === 200 && method === 'PUT') {
        securityLogger.log('EQUIPMENT_UPDATED', {
          userId: req.user?.id,
          username: req.user?.username,
          equipmentId: req.params.id
        });
      }
      
      // Log equipment deletion
      if (path.startsWith('/api/equipment/') && statusCode === 200 && method === 'DELETE') {
        securityLogger.log('EQUIPMENT_DELETED', {
          userId: req.user?.id,
          username: req.user?.username,
          equipmentId: req.params.id
        });
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  }
};

module.exports = securityLogger;
