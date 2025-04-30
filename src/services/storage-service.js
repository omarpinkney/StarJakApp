// Storage Service for Star Jak Mobile App
// This service handles persistent storage operations using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PAIRED_DEVICES: 'pairedDevices',
  SETTINGS: 'settings',
  ERROR_LOGS: 'errorLogs',
  LAST_AUTO_ACTION: 'lastAutoAction',
  LAST_MANUAL_ACTION: 'lastManualAction'
};

// Default settings
const DEFAULT_SETTINGS = {
  proximityEnabled: true,
  ambientLightEnabled: false,
  motionEnabled: false,
  twistSpeed: 75
};

class StorageService {
  // Load paired devices from AsyncStorage
  async loadPairedDevices() {
    try {
      const pairedDevicesString = await AsyncStorage.getItem(STORAGE_KEYS.PAIRED_DEVICES);
      
      if (pairedDevicesString) {
        return JSON.parse(pairedDevicesString);
      }
      
      return {};
    } catch (error) {
      console.error('Failed to load paired devices:', error);
      return {};
    }
  }
  
  // Save paired device to AsyncStorage
  async savePairedDevice(position, deviceId) {
    try {
      // Get existing paired devices
      const existingPairedDevices = await this.loadPairedDevices();
      
      // Update with new device
      existingPairedDevices[position] = deviceId;
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.PAIRED_DEVICES, 
        JSON.stringify(existingPairedDevices)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to save paired device:', error);
      return false;
    }
  }
  
  // Remove paired device from AsyncStorage
  async removePairedDevice(position) {
    try {
      // Get existing paired devices
      const existingPairedDevices = await this.loadPairedDevices();
      
      // Remove device
      delete existingPairedDevices[position];
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.PAIRED_DEVICES, 
        JSON.stringify(existingPairedDevices)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to remove paired device:', error);
      return false;
    }
  }
  
  // Clear all paired devices from AsyncStorage
  async clearPairedDevices() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PAIRED_DEVICES);
      return true;
    } catch (error) {
      console.error('Failed to clear paired devices:', error);
      return false;
    }
  }
  
  // Load settings from AsyncStorage
  async loadSettings() {
    try {
      const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      
      if (settingsString) {
        return JSON.parse(settingsString);
      }
      
      // Save and return default settings if none exist
      await this.saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }
  
  // Save settings to AsyncStorage
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS, 
        JSON.stringify(settings)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }
  
  // Load last auto action from AsyncStorage
  async loadLastAutoAction() {
    try {
      const lastAutoActionString = await AsyncStorage.getItem(STORAGE_KEYS.LAST_AUTO_ACTION);
      
      if (lastAutoActionString) {
        return JSON.parse(lastAutoActionString);
      }
      
      return { date: null, type: null };
    } catch (error) {
      console.error('Failed to load last auto action:', error);
      return { date: null, type: null };
    }
  }
  
  // Save last auto action to AsyncStorage
  async saveLastAutoAction(action) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_AUTO_ACTION, 
        JSON.stringify(action)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to save last auto action:', error);
      return false;
    }
  }
  
  // Load last manual action timestamp from AsyncStorage
  async loadLastManualAction() {
    try {
      const lastManualActionString = await AsyncStorage.getItem(STORAGE_KEYS.LAST_MANUAL_ACTION);
      
      if (lastManualActionString) {
        return parseInt(lastManualActionString, 10);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load last manual action:', error);
      return null;
    }
  }
  
  // Save last manual action timestamp to AsyncStorage
  async saveLastManualAction(timestamp) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_MANUAL_ACTION, 
        timestamp.toString()
      );
      
      return true;
    } catch (error) {
      console.error('Failed to save last manual action:', error);
      return false;
    }
  }
  
  // Add error log to AsyncStorage
  async addErrorLog(log) {
    try {
      // Get existing logs
      const existingLogsString = await AsyncStorage.getItem(STORAGE_KEYS.ERROR_LOGS);
      const existingLogs = existingLogsString ? JSON.parse(existingLogsString) : [];
      
      // Add timestamp to log
      const logWithTimestamp = {
        ...log,
        timestamp: new Date().toISOString()
      };
      
      // Add new log
      existingLogs.push(logWithTimestamp);
      
      // Limit logs to last 100
      const limitedLogs = existingLogs.slice(-100);
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.ERROR_LOGS, 
        JSON.stringify(limitedLogs)
      );
      
      return true;
    } catch (error) {
      console.error('Failed to add error log:', error);
      return false;
    }
  }
  
  // Get all error logs from AsyncStorage
  async getErrorLogs() {
    try {
      const logsString = await AsyncStorage.getItem(STORAGE_KEYS.ERROR_LOGS);
      
      if (logsString) {
        return JSON.parse(logsString);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get error logs:', error);
      return [];
    }
  }
  
  // Clear all error logs from AsyncStorage
  async clearErrorLogs() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ERROR_LOGS);
      return true;
    } catch (error) {
      console.error('Failed to clear error logs:', error);
      return false;
    }
  }
  
  // Clear all data from AsyncStorage (factory reset)
  async clearAllData() {
    try {
      const keys = [
        STORAGE_KEYS.PAIRED_DEVICES,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.ERROR_LOGS,
        STORAGE_KEYS.LAST_AUTO_ACTION,
        STORAGE_KEYS.LAST_MANUAL_ACTION
      ];
      
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

export default storageService;