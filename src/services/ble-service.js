// BLE Service for Star Jak Mobile App
// This service handles all BLE-related functionality

import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// BLE UUIDs
export const BLE_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
export const COMMAND_CHAR_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
export const STATUS_CHAR_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
export const SENSOR_CHAR_UUID = "6E400004-B5A3-F393-E0A9-E50E24DCCA9E";

// Command Types
export const CMD_EXTEND = "EXTEND";
export const CMD_RETRACT = "RETRACT";
export const CMD_STOP = "STOP";
export const CMD_ROTATE_CW = "ROTATE_CW";
export const CMD_ROTATE_CCW = "ROTATE_CCW";
export const CMD_STATUS = "STATUS";

// Threshold Values
export const PROXIMITY_WARNING_THRESHOLD = 3000;
export const DAYLIGHT_THRESHOLD = 1000;
export const NIGHTTIME_THRESHOLD = 300;

// Error Codes
export const ERR_NONE = 0;
export const ERR_MOTOR_STALLED = 1;
export const ERR_OVERCURRENT = 2;
export const ERR_OVERHEAT = 3;
export const ERR_LOW_BATTERY = 4;
export const ERR_POSITION_ERROR = 5;
export const ERR_OBSTRUCTION = 6;
export const ERR_COMM_TIMEOUT = 7;
export const ERR_INTERNAL = 8;

class BleService {
  constructor() {
    this.manager = new BleManager();
    this.devices = {};
    this.statusListeners = new Map();
    this.sensorListeners = new Map();
    this.connectionListeners = new Map();
    this.errorListeners = new Map();
    
    // Initialize event listeners
    this.setupEventListeners();
  }
  
  // Set up BLE event listeners
  setupEventListeners() {
    this.stateSubscription = this.manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        console.log('Bluetooth is powered on');
        this.notifyListeners('connection', { type: 'bluetoothOn' });
      } else {
        console.log('Bluetooth state:', state);
        this.notifyListeners('connection', { type: 'bluetoothState', state });
      }
    }, true);
  }
  
  // Add event listener
  addEventListener(event, id, callback) {
    let listeners;
    
    switch (event) {
      case 'status':
        listeners = this.statusListeners;
        break;
      case 'sensor':
        listeners = this.sensorListeners;
        break;
      case 'connection':
        listeners = this.connectionListeners;
        break;
      case 'error':
        listeners = this.errorListeners;
        break;
      default:
        console.error('Unknown event type:', event);
        return;
    }
    
    listeners.set(id, callback);
  }
  
  // Remove event listener
  removeEventListener(event, id) {
    let listeners;
    
    switch (event) {
      case 'status':
        listeners = this.statusListeners;
        break;
      case 'sensor':
        listeners = this.sensorListeners;
        break;
      case 'connection':
        listeners = this.connectionListeners;
        break;
      case 'error':
        listeners = this.errorListeners;
        break;
      default:
        console.error('Unknown event type:', event);
        return;
    }
    
    listeners.delete(id);
  }
  
  // Notify all listeners for a specific event
  notifyListeners(event, data) {
    let listeners;
    
    switch (event) {
      case 'status':
        listeners = this.statusListeners;
        break;
      case 'sensor':
        listeners = this.sensorListeners;
        break;
      case 'connection':
        listeners = this.connectionListeners;
        break;
      case 'error':
        listeners = this.errorListeners;
        break;
      default:
        console.error('Unknown event type:', event);
        return;
    }
    
    for (const callback of listeners.values()) {
      callback(data);
    }
  }
  
  // Start scanning for BLE devices
  startScan(onDeviceFound) {
    this.manager.startDeviceScan(
      [BLE_SERVICE_UUID], 
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          this.notifyListeners('error', { type: 'scanError', error });
          return;
        }
        
        if (device) {
          onDeviceFound(device);
        }
      }
    );
    
    this.notifyListeners('connection', { type: 'scanStarted' });
  }
  
  // Stop scanning for BLE devices
  stopScan() {
    this.manager.stopDeviceScan();
    this.notifyListeners('connection', { type: 'scanStopped' });
  }
  
  // Connect to a device
  async connectToDevice(deviceId, position) {
    try {
      console.log(`Connecting to device ${deviceId} for position ${position}...`);
      this.notifyListeners('connection', { type: 'connecting', deviceId, position });
      
      // Cancel any existing connection first
      try {
        const existingDevice = this.devices[position];
        if (existingDevice) {
          await existingDevice.cancelConnection();
        }
      } catch (e) {
        console.log('No existing connection to cancel');
      }
      
      // Connect to the new device
      const device = await this.manager.connectToDevice(deviceId);
      console.log('Connected to device');
      
      await device.discoverAllServicesAndCharacteristics();
      console.log('Discovered services and characteristics');
      
      // Set up notification listener for status updates
      this.setupStatusNotifications(device, position);
      
      // Set up notification listener for sensor updates
      this.setupSensorNotifications(device, position);
      
      // Set up disconnection listener
      this.setupDisconnectionListener(device, position);
      
      // Store the connected device
      this.devices[position] = device;
      
      // Notify listeners about successful connection
      this.notifyListeners('connection', { 
        type: 'connected', 
        deviceId, 
        position,
        device: {
          id: device.id,
          name: device.name || 'Unknown Device',
        }
      });
      
      // Request initial status
      this.sendCommand(position, CMD_STATUS);
      
      return true;
    } catch (error) {
      console.error(`Connection error for ${position}:`, error);
      this.notifyListeners('error', { 
        type: 'connectionError', 
        deviceId, 
        position,
        error 
      });
      return false;
    }
  }
  
  // Set up status notifications
  setupStatusNotifications(device, position) {
    device.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      STATUS_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('Status notification error:', error);
          this.notifyListeners('error', { 
            type: 'statusNotificationError', 
            deviceId: device.id,
            position,
            error 
          });
          return;
        }
        
        if (characteristic?.value) {
          const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf8');
          try {
            const statusData = JSON.parse(decodedValue);
            
            // Notify listeners about status update
            this.notifyListeners('status', { 
              position,
              deviceId: device.id,
              ...statusData
            });
          } catch (e) {
            console.error('Error parsing status JSON:', e);
            this.notifyListeners('error', { 
              type: 'statusParsingError', 
              deviceId: device.id,
              position,
              error: e,
              rawData: decodedValue
            });
          }
        }
      }
    );
  }
  
  // Set up sensor notifications
  setupSensorNotifications(device, position) {
    device.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      SENSOR_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('Sensor notification error:', error);
          this.notifyListeners('error', { 
            type: 'sensorNotificationError', 
            deviceId: device.id,
            position,
            error 
          });
          return;
        }
        
        if (characteristic?.value) {
          const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf8');
          try {
            const sensorData = JSON.parse(decodedValue);
            
            // Notify listeners about sensor data update
            this.notifyListeners('sensor', { 
              position,
              deviceId: device.id,
              ...sensorData
            });
          } catch (e) {
            console.error('Error parsing sensor JSON:', e);
            this.notifyListeners('error', { 
              type: 'sensorParsingError', 
              deviceId: device.id,
              position,
              error: e,
              rawData: decodedValue
            });
          }
        }
      }
    );
  }
  
  // Set up disconnection listener
  setupDisconnectionListener(device, position) {
    device.onDisconnected((error) => {
      console.log(`Device ${device.id} disconnected`);
      
      // Clean up device reference
      if (this.devices[position]?.id === device.id) {
        this.devices[position] = null;
      }
      
      // Notify listeners about disconnection
      this.notifyListeners('connection', { 
        type: 'disconnected', 
        deviceId: device.id,
        position,
        error
      });
    });
  }
  
  // Send command to a rim
  async sendCommand(position, command) {
    try {
      const device = this.devices[position];
      
      if (!device) {
        console.error(`Cannot send command to ${position}: device not connected`);
        return false;
      }
      
      console.log(`Sending command ${command} to ${position}`);
      
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        Buffer.from(command).toString('base64')
      );
      
      console.log(`Command ${command} sent to ${position}`);
      
      // Log command in event history
      this.notifyListeners('connection', { 
        type: 'commandSent', 
        command,
        position,
        deviceId: device.id,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`Send command error for ${position}:`, error);
      
      this.notifyListeners('error', { 
        type: 'sendCommandError', 
        command,
        position,
        error
      });
      
      return false;
    }
  }
  
  // Disconnect from a device
  async disconnectDevice(position) {
    try {
      const device = this.devices[position];
      
      if (!device) {
        console.log(`No device connected for ${position}`);
        return true;
      }
      
      await device.cancelConnection();
      this.devices[position] = null;
      
      console.log(`Disconnected from ${position}`);
      return true;
    } catch (error) {
      console.error(`Disconnect error for ${position}:`, error);
      
      this.notifyListeners('error', { 
        type: 'disconnectError', 
        position,
        error
      });
      
      return false;
    }
  }
  
  // Disconnect from all devices
  async disconnectAllDevices() {
    const positions = Object.keys(this.devices);
    const results = [];
    
    for (const position of positions) {
      if (this.devices[position]) {
        const result = await this.disconnectDevice(position);
        results.push({ position, result });
      }
    }
    
    return results;
  }
  
  // Clean up resources
  cleanup() {
    // Remove event subscriptions
    if (this.stateSubscription) {
      this.stateSubscription.remove();
    }
    
    // Disconnect from all devices
    this.disconnectAllDevices();
    
    // Clear event listeners
    this.statusListeners.clear();
    this.sensorListeners.clear();
    this.connectionListeners.clear();
    this.errorListeners.clear();
  }
}

// Create singleton instance
const bleService = new BleService();

export default bleService;