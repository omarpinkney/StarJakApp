// services/BleService.js
import { BleManager } from 'react-native-ble-plx';
import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { SERVICE_UUID, COMMAND_UUID, STATUS_UUID, SENSOR_UUID } from '../utils/constants';

let bleManager = null;

// Initialize BLE manager
export const initBleManager = async () => {
  if (bleManager === null) {
    bleManager = new BleManager();
    
    // Request permissions on Android
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Star Jak needs access to your location for Bluetooth scanning',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Location permission not granted');
      }
    }
  }
  
  return bleManager;
};

// Scan for devices
export const scanForDevices = (onDeviceFound) => {
  if (!bleManager) {
    throw new Error('BLE Manager not initialized');
  }
  
  return bleManager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.error('BLE scan error:', error);
      return;
    }
    
    if (device) {
      onDeviceFound(device);
    }
  });
};

// Connect to a device
export const connectToDevice = async (device) => {
  if (!bleManager) {
    throw new Error('BLE Manager not initialized');
  }
  
  try {
    // Connect to device
    const connectedDevice = await device.connect();
    
    // Discover services and characteristics
    const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
    
    return discoveredDevice;
  } catch (error) {
    console.error('Connection error:', error);
    throw error;
  }
};

// Connect to a paired rim
export const connectToRim = async (rim) => {
  if (!bleManager) {
    throw new Error('BLE Manager not initialized');
  }
  
  try {
    // Connect to device by ID
    const device = await bleManager.connectToDevice(rim.id);
    
    // Discover services and characteristics
    const discoveredDevice = await device.discoverAllServicesAndCharacteristics();
    
    return discoveredDevice;
  } catch (error) {
    console.error(`Failed to connect to rim ${rim.position}:`, error);
    throw error;
  }
};

// Disconnect from a device
export const disconnectFromDevice = async (device) => {
  if (!device) return;
  
  try {
    await device.cancelConnection();
  } catch (error) {
    console.error('Disconnect error:', error);
  }
};

// Disconnect from a rim
export const disconnectFromRim = async (rim) => {
  return disconnectFromDevice(rim);
};

// Send command to a device
export const sendCommand = async (device, command) => {
  if (!device) {
    throw new Error('Device not connected');
  }
  
  try {
    await device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      COMMAND_UUID,
      Buffer.from(command).toString('base64')
    );
  } catch (error) {
    console.error('Command error:', error);
    throw error;
  }
};

// Subscribe to status updates
export const subscribeToStatus = (device, onStatusUpdate) => {
  if (!device) {
    throw new Error('Device not connected');
  }
  
  try {
    // Subscribe to status characteristic
    return device.monitorCharacteristicForService(
      SERVICE_UUID,
      STATUS_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('Status monitoring error:', error);
          return;
        }
        
        if (characteristic?.value) {
          const valueBase64 = characteristic.value;
          const valueBuffer = Buffer.from(valueBase64, 'base64');
          const valueString = valueBuffer.toString();
          
          try {
            const status = JSON.parse(valueString);
            onStatusUpdate(status);
          } catch (parseError) {
            console.error('Status parse error:', parseError);
          }
        }
      }
    );
  } catch (error) {
    console.error('Status subscription error:', error);
    throw error;
  }
};

// Subscribe to sensor updates
export const subscribeToSensor = (device, onSensorUpdate) => {
  if (!device) {
    throw new Error('Device not connected');
  }
  
  try {
    // Subscribe to sensor characteristic
    return device.monitorCharacteristicForService(
      SERVICE_UUID,
      SENSOR_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('Sensor monitoring error:', error);
          return;
        }
        
        if (characteristic?.value) {
          const valueBase64 = characteristic.value;
          const valueBuffer = Buffer.from(valueBase64, 'base64');
          const valueString = valueBuffer.toString();
          
          try {
            const sensor = JSON.parse(valueString);
            onSensorUpdate(sensor);
          } catch (parseError) {
            console.error('Sensor parse error:', parseError);
          }
        }
      }
    );
  } catch (error) {
    console.error('Sensor subscription error:', error);
    throw error;
  }
};

// Start status monitoring
export const startStatusMonitoring = () => {
  // This is a placeholder for any initialization needed for status monitoring
  console.log('Status monitoring started');
};

// services/StorageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAIRED_RIMS_KEY = '@StarJak:pairedRims';
const SENSOR_SETTINGS_KEY = '@StarJak:sensorSettings';

// Load paired rims
export const loadPairedRims = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(PAIRED_RIMS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Failed to load paired rims:', error);
    return [];
  }
};

// Save all paired rims
export const savePairedRims = async (rims) => {
  try {
    const jsonValue = JSON.stringify(rims);
    await AsyncStorage.setItem(PAIRED_RIMS_KEY, jsonValue);
  } catch (error) {
    console.error('Failed to save paired rims:', error);
    throw error;
  }
};

// Save a single paired rim
export const savePairedRim = async (rim) => {
  try {
    const rims = await loadPairedRims();
    
    // Check if rim already exists
    const exists = rims.findIndex(r => r.id === rim.id);
    
    if (exists >= 0) {
      // Update existing rim
      rims[exists] = rim;
    } else {
      // Add new rim
      rims.push(rim);
    }
    
    await savePairedRims(rims);
  } catch (error) {
    console.error('Failed to save paired rim:', error);
    throw error;
  }
};

// Clear all paired rims
export const clearAllPairedRims = async () => {
  try {
    await AsyncStorage.removeItem(PAIRED_RIMS_KEY);
  } catch (error) {
    console.error('Failed to clear paired rims:', error);
    throw error;
  }
};

// Load sensor settings
export const loadSensorSettings = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(SENSOR_SETTINGS_KEY);
    return jsonValue != null 
      ? JSON.parse(jsonValue) 
      : {
          motionSensor: false,
          proximitySensor: false,
          ambientSensor: false,
        };
  } catch (error) {
    console.error('Failed to load sensor settings:', error);
    return {
      motionSensor: false,
      proximitySensor: false,
      ambientSensor: false,
    };
  }
};

// Save sensor settings
export const saveSensorSettings = async (settings) => {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SENSOR_SETTINGS_KEY, jsonValue);
  } catch (error) {
    console.error('Failed to save sensor settings:', error);
    throw error;
  }
};