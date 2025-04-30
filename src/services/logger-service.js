// Logger Service for Star Jak Mobile App
// This service handles logging of events, commands, errors, etc.

import { Platform } from 'react-native';
import storageService from './storage-service';

// Log types
export const LOG_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CONNECTION: 'connection',
  COMMAND: 'command',
  STATUS: 'status',
  SENSOR: 'sensor',
};

class LoggerService {
  constructor() {
    this.logs = [];
    this.maxLogSize = 100; // Maximum number of logs to keep in memory
  }
  
  // Initialize logger
  async initialize() {
    try {
      // Load existing logs from storage
      const storedLogs = await storageService.getErrorLogs();
      this.logs = storedLogs || [];
      
      console.log(`Loaded ${this.logs.length} logs from storage`);
      return true;
    } catch (error) {
      console.error('Failed to initialize logger:', error);
      return false;
    }
  }
  
  // Log an event
  async log(type, message, data = {}) {
    const logEntry = {
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
      appInfo: this.getAppInfo(),
    };
    
    // Add to in-memory logs
    this.logs.push(logEntry);
    
    // Trim logs if they exceed the maximum size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }
    
    // Save to persistent storage if it's an error or warning
    if (type === LOG_TYPES.ERROR || type === LOG_TYPES.WARNING) {
      await storageService.addErrorLog(logEntry);
    }
    
    // Also output to console
    if (type === LOG_TYPES.ERROR) {
      console.error(`[${type.toUpperCase()}] ${message}`, data);
    } else if (type === LOG_TYPES.WARNING) {
      console.warn(`[${type.toUpperCase()}] ${message}`, data);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`, data);
    }
    
    return logEntry;
  }
  
  // Log info
  async info(message, data = {}) {
    return await this.log(LOG_TYPES.INFO, message, data);
  }
  
  // Log warning
  async warning(message, data = {}) {
    return await this.log(LOG_TYPES.WARNING, message, data);
  }
  
  // Log error
  async error(message, data = {}) {
    return await this.log(LOG_TYPES.ERROR, message, data);
  }
  
  // Log connection event
  async logConnection(message, data = {}) {
    return await this.log(LOG_TYPES.CONNECTION, message, data);
  }
  
  // Log command
  async logCommand(command, position, success, data = {}) {
    return await this.log(LOG_TYPES.COMMAND, `Command ${command} sent to ${position}`, {
      command,
      position,
      success,
      ...data,
    });
  }
  
  // Log status update
  async logStatus(position, status, data = {}) {
    return await this.log(LOG_TYPES.STATUS, `Status update for ${position}: ${status}`, {
      position,
      status,
      ...data,
    });
  }
  
  // Log sensor data
  async logSensor(position, sensorData) {
    return await this.log(LOG_TYPES.SENSOR, `Sensor data for ${position}`, {
      position,
      ...sensorData,
    });
  }
  
  // Get app info
  getAppInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      appVersion: '1.0.0', // Should be dynamically retrieved in a real app
    };
  }
  
  // Get all logs
  getLogs() {
    return this.logs;
  }
  
  // Get logs by type
  getLogsByType(type) {
    return this.logs.filter(log => log.type === type);
  }
  
  // Get error logs
  getErrorLogs() {
    return this.getLogsByType(LOG_TYPES.ERROR);
  }
  
  // Get logs for export
  async getLogsForExport() {
    // Get all stored error logs (these are persistent)
    const storedLogs = await storageService.getErrorLogs();
    
    // Combined logs for export - persistent error logs + in-memory logs
    const combinedLogs = [
      ...storedLogs,
      ...this.logs.filter(log => {
        // Only include in-memory logs that aren't already in stored logs
        const isInStoredLogs = storedLogs.some(
          storedLog => storedLog.timestamp === log.timestamp
        );
        return !isInStoredLogs;
      }),
    ];
    
    // Sort logs by timestamp
    combinedLogs.sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    return combinedLogs;
  }
  
  // Generate formatted log string for export
  async generateFormattedLogs() {
    const logs = await this.getLogsForExport();
    
    if (logs.length === 0) {
      return 'No logs available.';
    }
    
    const appInfo = this.getAppInfo();
    
    let formattedLog = `Star Jak App Logs\n`;
    formattedLog += `App Version: ${appInfo.appVersion}\n`;
    formattedLog += `Platform: ${appInfo.platform} ${appInfo.version}\n`;
    formattedLog += `Generated: ${new Date().toISOString()}\n`;
    formattedLog += `\n`;
    formattedLog += `--------------------------------------------------\n\n`;
    
    logs.forEach(log => {
      formattedLog += `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}\n`;
      
      // Add data details if available
      if (log.data && Object.keys(log.data).length > 0) {
        formattedLog += `Data: ${JSON.stringify(log.data, null, 2)}\n`;
      }
      
      formattedLog += `\n`;
    });
    
    return formattedLog;
  }
  
  // Clear all logs
  async clearLogs() {
    this.logs = [];
    return await storageService.clearErrorLogs();
  }
}

// Create singleton instance
const loggerService = new LoggerService();

export default loggerService;