// Utility functions for Star Jak Mobile App

import { Alert, Platform } from 'react-native';
import { Animated, Easing } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import loggerService from './logger-service';

// Check and request Bluetooth permissions (Android)
export const requestBluetoothPermissions = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 23) {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        Platform.Version >= 31 ? PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN : '',
        Platform.Version >= 31 ? PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT : '',
      ].filter(Boolean));
      
      const allPermissionsGranted = Object.values(granted).every(
        value => value === PermissionsAndroid.RESULTS.GRANTED
      );
      
      return allPermissionsGranted;
    } catch (error) {
      loggerService.error('Permission request error', { error });
      return false;
    }
  }
  
  return true; // iOS doesn't need runtime permissions
};

// Get formatted date
export const getFormattedDate = () => {
  const date = new Date();
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get status color based on rim state
export const getStatusColor = (connected, state) => {
  if (!connected) return '#FF4136'; // Red for disconnected
  
  switch (state) {
    case 'EXTENDING':
    case 'RETRACTING':
    case 'ROTATING_CW':
    case 'ROTATING_CCW':
      return '#FFDC00'; // Yellow for moving
    case 'ERROR':
      return '#FF4136'; // Red for error
    default:
      return '#2ECC40'; // Green for connected and idle
  }
};

// Get readable position name
export const getPositionName = (position) => {
  const positionNames = {
    frontDriver: 'Front Driver',
    frontPassenger: 'Front Passenger',
    rearDriver: 'Rear Driver',
    rearPassenger: 'Rear Passenger',
    aux: 'Auxiliary',
  };
  
  return positionNames[position] || position;
};

// Create animation for extending/retracting rims
export const createRimAnimation = (startValue, toValue, duration = 1000) => {
  const animValue = new Animated.Value(startValue);
  
  const animation = Animated.timing(animValue, {
    toValue,
    duration,
    easing: Easing.bezier(0.42, 0, 0.58, 1), // Smooth easing
    useNativeDriver: true,
  });
  
  return { animation, animValue };
};

// Create rotation animation
export const createRotationAnimation = (startValue, duration = 2000, clockwise = true) => {
  const rotateValue = new Animated.Value(startValue);
  
  const animation = Animated.timing(rotateValue, {
    toValue: startValue + (clockwise ? 1 : -1),
    duration,
    easing: Easing.linear,
    useNativeDriver: true,
  });
  
  // Interpolate to create a full rotation
  const rotateInterpolation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return { animation, rotateValue, rotateInterpolation };
};

// Create pulse animation (for status indicators)
export const createPulseAnimation = (startValue = 1, minValue = 0.6, maxValue = 1, duration = 1000) => {
  const pulseValue = new Animated.Value(startValue);
  
  const pulseAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseValue, {
        toValue: minValue,
        duration: duration / 2,
        easing: Easing.sin,
        useNativeDriver: true,
      }),
      Animated.timing(pulseValue, {
        toValue: maxValue,
        duration: duration / 2,
        easing: Easing.sin,
        useNativeDriver: true,
      }),
    ])
  );
  
  return { pulseAnimation, pulseValue };
};

// Show error alert
export const showErrorAlert = (title, message, onOk = null) => {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', onPress: onOk }],
    { cancelable: false }
  );
  
  // Also log the error
  loggerService.error(title, { message });
};

// Show confirmation alert
export const showConfirmAlert = (title, message, onConfirm, onCancel = null) => {
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Confirm', onPress: onConfirm }
    ],
    { cancelable: false }
  );
};

// Get error message from error object
export const getErrorMessage = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && error.message) {
    return error.message;
  }
  
  return 'An unknown error occurred';
};

// Create demo sequence for demo mode
export const createDemoSequence = () => {
  const CMD_EXTEND = "EXTEND";
  const CMD_RETRACT = "RETRACT";
  const CMD_STOP = "STOP";
  const CMD_ROTATE_CW = "ROTATE_CW";
  const CMD_ROTATE_CCW = "ROTATE_CCW";
  
  return [
    { command: CMD_EXTEND, delay: 2000 },
    { command: CMD_ROTATE_CW, delay: 3000 },
    { command: CMD_STOP, delay: 1000 },
    { command: CMD_ROTATE_CCW, delay: 3000 },
    { command: CMD_STOP, delay: 1000 },
    { command: CMD_RETRACT, delay: 2000 },
    { command: CMD_EXTEND, delay: 2000 },
    { command: CMD_RETRACT, delay: 2000 },
  ];
};

// Format BLE MAC address
export const formatMacAddress = (deviceId) => {
  // Some BLE libraries format MAC addresses differently
  if (deviceId.includes(':')) {
    return deviceId; // Already formatted
  }
  
  // Format as XX:XX:XX:XX:XX:XX
  const matches = deviceId.match(/.{1,2}/g);
  if (matches) {
    return matches.join(':').toUpperCase();
  }
  
  return deviceId;
};

// Get time since last action in human-readable format
export const getTimeSinceLastAction = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
};

export default {
  requestBluetoothPermissions,
  getFormattedDate,
  isValidEmail,
  getStatusColor,
  getPositionName,
  createRimAnimation,
  createRotationAnimation,
  createPulseAnimation,
  showErrorAlert,
  showConfirmAlert,
  getErrorMessage,
  createDemoSequence,
  formatMacAddress,
  getTimeSinceLastAction,
};