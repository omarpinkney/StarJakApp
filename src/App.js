// Star Jak Mobile App
// Complete React Native implementation for controlling Star Jak extendable/retractable car rims

import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  Slider,
  StatusBar,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  FlatList,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// BLE UUIDs
const BLE_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const COMMAND_CHAR_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const STATUS_CHAR_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const SENSOR_CHAR_UUID = "6E400004-B5A3-F393-E0A9-E50E24DCCA9E";

// Command Types
const CMD_EXTEND = "EXTEND";
const CMD_RETRACT = "RETRACT";
const CMD_STOP = "STOP";
const CMD_ROTATE_CW = "ROTATE_CW";
const CMD_ROTATE_CCW = "ROTATE_CCW";
const CMD_STATUS = "STATUS";

// Threshold Values
const PROXIMITY_WARNING_THRESHOLD = 3000;
const DAYLIGHT_THRESHOLD = 1000;
const NIGHTTIME_THRESHOLD = 300;

// Initialize BLE Manager
const bleManager = new BleManager();

// Navigation
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// App State
const initialRimState = {
  frontDriver: { connected: false, deviceId: null, state: 'IDLE', proximity: 0, light: 0, motion: false },
  frontPassenger: { connected: false, deviceId: null, state: 'IDLE', proximity: 0, light: 0, motion: false },
  rearDriver: { connected: false, deviceId: null, state: 'IDLE', proximity: 0, light: 0, motion: false },
  rearPassenger: { connected: false, deviceId: null, state: 'IDLE', proximity: 0, light: 0, motion: false },
  aux: { connected: false, deviceId: null, state: 'IDLE', proximity: 0, light: 0, motion: false },
};

// App Context
const AppContext = React.createContext();

// App Provider Component
const AppProvider = ({ children }) => {
  const [rimsState, setRimsState] = useState(initialRimState);
  const [scanning, setScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [settings, setSettings] = useState({
    proximityEnabled: true,
    ambientLightEnabled: false,
    motionEnabled: false,
    twistSpeed: 75,
  });
  const [demoActive, setDemoActive] = useState(false);
  const [lastAutoAction, setLastAutoAction] = useState({
    date: null,
    type: null,
  });
  const [lastManualAction, setLastManualAction] = useState(null);
  const demoTimerRef = useRef(null);

  // Load saved settings and paired devices on app start
  useEffect(() => {
    loadSettings();
    loadPairedDevices();
    
    // Set up BLE listeners
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        console.log('Bluetooth is powered on');
        connectToSavedDevices();
      }
    }, true);
    
    return () => {
      subscription.remove();
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
      }
    };
  }, []);

  // Load settings from AsyncStorage
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Save settings to AsyncStorage
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Load paired devices from AsyncStorage
  const loadPairedDevices = async () => {
    try {
      const pairedDevices = await AsyncStorage.getItem('pairedDevices');
      if (pairedDevices) {
        const devices = JSON.parse(pairedDevices);
        
        // Update rimsState with saved device IDs
        const updatedRimsState = { ...rimsState };
        Object.keys(devices).forEach(position => {
          if (updatedRimsState[position]) {
            updatedRimsState[position].deviceId = devices[position];
          }
        });
        
        setRimsState(updatedRimsState);
      }
    } catch (error) {
      console.error('Failed to load paired devices:', error);
    }
  };

  // Save paired device to AsyncStorage
  const savePairedDevice = async (position, deviceId) => {
    try {
      // Get existing paired devices
      const existingPairedDevicesString = await AsyncStorage.getItem('pairedDevices');
      const existingPairedDevices = existingPairedDevicesString 
        ? JSON.parse(existingPairedDevicesString) 
        : {};
      
      // Update with new device
      existingPairedDevices[position] = deviceId;
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem('pairedDevices', JSON.stringify(existingPairedDevices));
      
      // Update rimsState
      const updatedRimsState = { ...rimsState };
      updatedRimsState[position].deviceId = deviceId;
      setRimsState(updatedRimsState);
    } catch (error) {
      console.error('Failed to save paired device:', error);
    }
  };

  // Connect to saved devices
  const connectToSavedDevices = async () => {
    try {
      const pairedDevicesString = await AsyncStorage.getItem('pairedDevices');
      if (!pairedDevicesString) return;
      
      const pairedDevices = JSON.parse(pairedDevicesString);
      
      Object.entries(pairedDevices).forEach(([position, deviceId]) => {
        if (deviceId) {
          connectToDevice(deviceId, position);
        }
      });
    } catch (error) {
      console.error('Failed to connect to saved devices:', error);
    }
  };

  // Start scanning for BLE devices
  const startScan = () => {
    if (scanning) return;
    
    setScannedDevices([]);
    setScanning(true);
    
    bleManager.startDeviceScan(
      [BLE_SERVICE_UUID], 
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          setScanning(false);
          return;
        }
        
        if (device) {
          setScannedDevices(prevDevices => {
            // Check if device already exists in the array
            if (!prevDevices.find(d => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      }
    );
    
    // Stop scan after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setScanning(false);
    }, 10000);
  };

  // Stop scanning for BLE devices
  const stopScan = () => {
    bleManager.stopDeviceScan();
    setScanning(false);
  };

  // Connect to a specific device
  const connectToDevice = async (deviceId, position) => {
    try {
      console.log(`Connecting to device ${deviceId} for position ${position}...`);
      
      const device = await bleManager.connectToDevice(deviceId);
      console.log('Connected to device');
      
      await device.discoverAllServicesAndCharacteristics();
      console.log('Discovered services and characteristics');
      
      // Set up notification listeners for status updates
      device.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        STATUS_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Status notification error:', error);
            return;
          }
          
          if (characteristic?.value) {
            const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf8');
            try {
              const status = JSON.parse(decodedValue);
              
              // Update rim state with new status
              setRimsState(prevState => ({
                ...prevState,
                [position]: {
                  ...prevState[position],
                  connected: true,
                  state: status.state,
                }
              }));
            } catch (e) {
              console.error('Error parsing status JSON:', e);
            }
          }
        }
      );
      
      // Set up notification listeners for sensor updates
      device.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        SENSOR_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Sensor notification error:', error);
            return;
          }
          
          if (characteristic?.value) {
            const decodedValue = Buffer.from(characteristic.value, 'base64').toString('utf8');
            try {
              const sensorData = JSON.parse(decodedValue);
              
              // Update rim state with new sensor data
              setRimsState(prevState => ({
                ...prevState,
                [position]: {
                  ...prevState[position],
                  proximity: sensorData.proximity,
                  light: sensorData.light,
                  motion: sensorData.motion,
                }
              }));
              
              // Handle automatic actions based on ambient light
              if (settings.ambientLightEnabled) {
                handleAmbientLightAutomation(position, sensorData.light);
              }
            } catch (e) {
              console.error('Error parsing sensor JSON:', e);
            }
          }
        }
      );
      
      // Update rim state to show connected
      setRimsState(prevState => ({
        ...prevState,
        [position]: {
          ...prevState[position],
          connected: true,
          deviceId: deviceId,
        }
      }));
      
      // Set up listener for disconnection
      device.onDisconnected(() => {
        console.log(`Device ${deviceId} disconnected`);
        setRimsState(prevState => ({
          ...prevState,
          [position]: {
            ...prevState[position],
            connected: false,
          }
        }));
      });
      
      // Request initial status
      sendCommand(position, CMD_STATUS);
      
      return true;
    } catch (error) {
      console.error(`Connection error for ${position}:`, error);
      return false;
    }
  };

  // Send command to a rim
  const sendCommand = async (position, command) => {
    try {
      const { deviceId, connected } = rimsState[position];
      
      if (!deviceId || !connected) {
        console.error(`Cannot send command to ${position}: device not connected`);
        return false;
      }
      
      // Check proximity before extending if enabled
      if (command === CMD_EXTEND && settings.proximityEnabled) {
        const { proximity } = rimsState[position];
        if (proximity > PROXIMITY_WARNING_THRESHOLD) {
          // Show warning and return without sending command
          return 'OBSTRUCTION';
        }
      }
      
      const device = await bleManager.devices([deviceId]);
      if (!device || device.length === 0) {
        console.error(`Device ${deviceId} not found`);
        return false;
      }
      
      await device[0].writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        COMMAND_CHAR_UUID,
        Buffer.from(command).toString('base64')
      );
      
      // Update last manual action timestamp
      if (command === CMD_EXTEND || command === CMD_RETRACT) {
        setLastManualAction(Date.now());
      }
      
      console.log(`Command ${command} sent to ${position}`);
      return true;
    } catch (error) {
      console.error(`Send command error for ${position}:`, error);
      return false;
    }
  };

  // Send command to all connected rims
  const sendCommandToAll = async (command) => {
    const results = [];
    const positions = Object.keys(rimsState);
    
    for (const position of positions) {
      if (rimsState[position].connected) {
        const result = await sendCommand(position, command);
        results.push({ position, result });
      }
    }
    
    return results;
  };

  // Toggle between extend and retract all
  const toggleAllRims = async () => {
    // Check if any rim is extending/extended
    const anyExtended = Object.values(rimsState).some(
      rim => rim.connected && (rim.state === 'EXTENDING' || rim.state === 'EXTENDED')
    );
    
    // If any rim is extended, retract all
    if (anyExtended) {
      return await sendCommandToAll(CMD_RETRACT);
    } else {
      // Otherwise extend all
      return await sendCommandToAll(CMD_EXTEND);
    }
  };

  // Handle ambient light automation
  const handleAmbientLightAutomation = (position, lightValue) => {
    const now = new Date();
    const today = now.toDateString();
    
    // Skip if we performed an auto action today already or if manual action was recent
    if (
      lastAutoAction.date === today ||
      (lastManualAction && Date.now() - lastManualAction < 12 * 60 * 60 * 1000) // 12 hours
    ) {
      return;
    }
    
    if (lightValue > DAYLIGHT_THRESHOLD && lastAutoAction.type !== 'EXTEND') {
      // Daytime - extend rims
      sendCommand(position, CMD_EXTEND);
      setLastAutoAction({ date: today, type: 'EXTEND' });
    } else if (lightValue < NIGHTTIME_THRESHOLD && lastAutoAction.type !== 'RETRACT') {
      // Nighttime - retract rims
      sendCommand(position, CMD_RETRACT);
      setLastAutoAction({ date: today, type: 'RETRACT' });
    }
  };

  // Start demo mode
  const startDemoMode = () => {
    if (demoActive) return;
    
    setDemoActive(true);
    runDemoSequence();
  };

  // Run demo sequence
  const runDemoSequence = () => {
    // Define the demo sequence
    const demoSequence = [
      { command: CMD_EXTEND, delay: 2000 },
      { command: CMD_ROTATE_CW, delay: 3000 },
      { command: CMD_STOP, delay: 1000 },
      { command: CMD_ROTATE_CCW, delay: 3000 },
      { command: CMD_STOP, delay: 1000 },
      { command: CMD_RETRACT, delay: 2000 },
      { command: CMD_EXTEND, delay: 2000 },
      { command: CMD_RETRACT, delay: 2000 },
    ];
    
    let currentStep = 0;
    
    const executeStep = () => {
      if (!demoActive) return;
      
      if (currentStep >= demoSequence.length) {
        // End of sequence, start over
        currentStep = 0;
      }
      
      const { command, delay } = demoSequence[currentStep];
      sendCommandToAll(command);
      
      demoTimerRef.current = setTimeout(() => {
        currentStep++;
        executeStep();
      }, delay);
    };
    
    executeStep();
  };

  // Stop demo mode
  const stopDemoMode = () => {
    setDemoActive(false);
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
    }
    
    // Stop all rims
    sendCommandToAll(CMD_STOP);
  };

  // Pair a new device
  const pairDevice = async (device, position) => {
    try {
      // Connect to the device
      const connected = await connectToDevice(device.id, position);
      
      if (!connected) {
        throw new Error('Failed to connect to device');
      }
      
      // Extend the rim for visual confirmation
      await sendCommand(position, CMD_EXTEND);
      
      // Wait for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Retract the rim
      await sendCommand(position, CMD_RETRACT);
      
      // Save the paired device
      await savePairedDevice(position, device.id);
      
      return true;
    } catch (error) {
      console.error('Pairing error:', error);
      return false;
    }
  };

  // Unpair device
  const unpairDevice = async (position) => {
    try {
      const { deviceId } = rimsState[position];
      
      if (deviceId) {
        // Disconnect from device
        const device = await bleManager.devices([deviceId]);
        if (device && device.length > 0) {
          await device[0].cancelConnection();
        }
      }
      
      // Remove from paired devices
      const pairedDevicesString = await AsyncStorage.getItem('pairedDevices');
      if (pairedDevicesString) {
        const pairedDevices = JSON.parse(pairedDevicesString);
        delete pairedDevices[position];
        await AsyncStorage.setItem('pairedDevices', JSON.stringify(pairedDevices));
      }
      
      // Update rimsState
      setRimsState(prevState => ({
        ...prevState,
        [position]: {
          ...initialRimState[position],
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Unpair error:', error);
      return false;
    }
  };

  // Unpair all devices
  const unpairAllDevices = async () => {
    try {
      // Disconnect from all devices
      for (const position of Object.keys(rimsState)) {
        const { deviceId } = rimsState[position];
        if (deviceId) {
          try {
            const device = await bleManager.devices([deviceId]);
            if (device && device.length > 0) {
              await device[0].cancelConnection();
            }
          } catch (e) {
            console.error(`Error disconnecting ${position}:`, e);
          }
        }
      }
      
      // Clear paired devices in AsyncStorage
      await AsyncStorage.removeItem('pairedDevices');
      
      // Reset rimsState
      setRimsState(initialRimState);
      
      return true;
    } catch (error) {
      console.error('Unpair all error:', error);
      return false;
    }
  };

  // Context value
  const contextValue = {
    rimsState,
    scanning,
    scannedDevices,
    settings,
    demoActive,
    startScan,
    stopScan,
    connectToDevice,
    sendCommand,
    sendCommandToAll,
    toggleAllRims,
    startDemoMode,
    stopDemoMode,
    saveSettings,
    pairDevice,
    unpairDevice,
    unpairAllDevices,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Splash Screen
const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace('Main');
    }, 2000);
  }, []);

  return (
    <LinearGradient
      colors={['#000000', '#12123e']}
      style={styles.splashContainer}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Image
        source={require('../assets/images/star-jak-logo.png')}
        style={styles.splashLogo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#4B69FF" style={styles.loadingIndicator} />
    </LinearGradient>
  );
};

// Main Screen (Control Screen)
const ControlScreen = () => {
  const {
    rimsState,
    settings,
    demoActive,
    sendCommand,
    toggleAllRims,
    startDemoMode,
    stopDemoMode,
  } = React.useContext(AppContext);
  
  const [obstruction, setObstruction] = useState({ detected: false, position: null });
  
  // Handle extend button press
  const handleExtend = async (position) => {
    const result = await sendCommand(position, CMD_EXTEND);
    if (result === 'OBSTRUCTION') {
      setObstruction({ detected: true, position });
    }
  };
  
  // Continue extending despite obstruction
  const continueExtend = async () => {
    await sendCommand(obstruction.position, CMD_EXTEND);
    setObstruction({ detected: false, position: null });
  };
  
  // Retract due to obstruction warning
  const retractObstruction = async () => {
    await sendCommand(obstruction.position, CMD_RETRACT);
    setObstruction({ detected: false, position: null });
  };
  
  // Get connection status color
  const getStatusColor = (position) => {
    const { connected, state } = rimsState[position];
    
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
  
  // Render wheel control
  const renderWheelControl = (position, x, y, label) => {
    const { connected, state } = rimsState[position];
    const isExtended = state === 'EXTENDING' || state === 'EXTENDED';
    const statusColor = getStatusColor(position);
    
    return (
      <View style={[styles.wheelControl, { left: x, top: y }]}>
        <Text style={styles.wheelLabel}>{label}</Text>
        
        <View style={styles.wheelButtons}>
          <TouchableOpacity
            style={[styles.wheelButton, { opacity: connected ? 1 : 0.5 }]}
            disabled={!connected}
            onPress={() => sendCommand(position, CMD_ROTATE_CCW)}
          >
            <Ionicons name="arrow-undo" size={20} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.wheelButton, { opacity: connected ? 1 : 0.5 }]}
            disabled={!connected}
            onPress={() => isExtended ? sendCommand(position, CMD_RETRACT) : handleExtend(position)}
          >
            <Ionicons 
              name={isExtended ? "arrow-down-outline" : "arrow-up-outline"} 
              size={24} 
              color="#FFF" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.wheelButton, { opacity: connected ? 1 : 0.5 }]}
            disabled={!connected}
            onPress={() => sendCommand(position, CMD_ROTATE_CW)}
          >
            <Ionicons name="arrow-redo" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#000000', '#12123e']}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('./assets/images/star-jak-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        
        {/* Car View */}
        <View style={styles.carContainer}>
          <Image
            source={require('./assets/images/car-top-view.png')}
            style={styles.carImage}
            resizeMode="contain"
          />
          
          {/* Wheel Controls */}
          {renderWheelControl('frontDriver', 20, 120, 'FL')}
          {renderWheelControl('frontPassenger', Dimensions.get('window').width - 90, 120, 'FR')}
          {renderWheelControl('rearDriver', 20, 320, 'RL')}
          {renderWheelControl('rearPassenger', Dimensions.get('window').width - 90, 320, 'RR')}
          
          {/* Sync All Button */}
          <View style={styles.syncContainer}>
            <Text style={styles.syncText}>Sync</Text>
            <TouchableOpacity 
              style={styles.syncButton}
              onPress={toggleAllRims}
            >
              <Image
                source={require('./assets/images/all-icon.png')}
                style={styles.syncIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={[styles.demoButton, demoActive && styles.demoButtonActive]}
            onPress={demoActive ? stopDemoMode : startDemoMode}
          >
            <Ionicons 
              name={demoActive ? "stop-circle-outline" : "play-circle-outline"} 
              size={28} 
              color="#FFF" 
            />
            <Text style={styles.demoText}>DEMO</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {/* Obstruction Warning Modal */}
      <Modal
        visible={obstruction.detected}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Ionicons name="warning-outline" size={50} color="#FFDC00" />
            <Text style={styles.modalTitle}>Obstruction Detected!</Text>
            <Text style={styles.modalText}>
              The proximity sensor has detected an obstruction near the rim.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={retractObstruction}
              >
                <Text style={styles.modalButtonText}>Retract</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  Alert.alert(
                    'Are you sure?',
                    'Extending with an obstruction may cause damage.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Continue', onPress: continueExtend }
                    ]
                  );
                }}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Contact Us Screen
const ContactScreen = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  
  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!formData.name || !formData.email || !formData.message) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setSending(true);
    
    // Generate error logs
    const errorLogs = await generateErrorLogs();
    
    // In a real app, you would send these to a server
    // For this demo, we'll just show a success message
    setTimeout(() => {
      setSending(false);
      Alert.alert(
        'Message Sent',
        'Your support request has been submitted. Our team will contact you shortly.',
        [{ text: 'OK', onPress: () => setFormData({ name: '', phone: '', email: '', message: '' }) }]
      );
    }, 1500);
  };
  
  // Generate error logs
  const generateErrorLogs = async () => {
    try {
      // In a real app, you would collect actual logs
      const logs = {
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0',
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        connectionEvents: [], // Would be populated with real events
        commandsSent: [],     // Would be populated with real commands
        warnings: [],         // Would be populated with real warnings
        errors: []            // Would be populated with real errors
      };
      
      return JSON.stringify(logs);
    } catch (error) {
      console.error('Error generating logs:', error);
      return '';
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#000000', '#12123e']}
        style={styles.background}
      >
        <View style={styles.contactHeader}>
          <Text style={styles.contactTitle}>Contact Us</Text>
        </View>
        
        <ScrollView style={styles.contactContainer}>
          <Text style={styles.contactDescription}>
            Need assistance with your Star Jak rims? Fill out the form below and our support team will get back to you as soon as possible.
          </Text>
          
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Name*</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your name"
              placeholderTextColor="#888"
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
            />
            
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your phone number"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
            />
            
            <Text style={styles.inputLabel}>Email Address*</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your email address"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
            />
            
            <Text style={styles.inputLabel}>Message*</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="Describe your issue or question"
              placeholderTextColor="#888"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={formData.message}
              onChangeText={(text) => updateField('message', text)}
            />
            
            <Text style={styles.formNote}>
              * Required fields. Error logs will be automatically attached to help diagnose your issue.
            </Text>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Settings Screen
const SettingsScreen = () => {
  const {
    rimsState,
    scanning,
    scannedDevices,
    settings,
    startScan,
    stopScan,
    saveSettings,
    pairDevice,
    unpairDevice,
    unpairAllDevices,
  } = React.useContext(AppContext);
  
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  
  // Handle settings toggle
  const handleSettingToggle = (setting) => {
    const newSettings = { ...settings, [setting]: !settings[setting] };
    saveSettings(newSettings);
  };
  
  // Handle pairing
  const handlePairButtonPress = (position) => {
    setSelectedPosition(position);
    setShowPairingModal(true);
    startScan();
  };
  
  // Handle device selection for pairing
  const handleDeviceSelect = async (device) => {
    setShowPairingModal(false);
    stopScan();
    
    // Show pairing in progress
    Alert.alert(
      'Pairing in Progress',
      'The selected rim will extend briefly for confirmation. Please wait...'
    );
    
    const success = await pairDevice(device, selectedPosition);
    
    if (success) {
      Alert.alert('Pairing Successful', `The rim has been paired to ${selectedPosition} position.`);
    } else {
      Alert.alert('Pairing Failed', 'Unable to pair with the selected device. Please try again.');
    }
  };
  
  // Handle unpair
  const handleUnpair = async (position) => {
    setSelectedPosition(position);
    setShowUnpairConfirm(true);
  };
  
  // Confirm unpair
  const confirmUnpair = async () => {
    setShowUnpairConfirm(false);
    
    const success = await unpairDevice(selectedPosition);
    
    if (success) {
      Alert.alert('Unpair Successful', `The rim has been unpaired from ${selectedPosition} position.`);
    } else {
      Alert.alert('Unpair Failed', 'Unable to unpair the device. Please try again.');
    }
  };
  
  // Handle unpair all
  const handleUnpairAll = () => {
    Alert.alert(
      'Unpair All Rims',
      'Are you sure you want to unpair all rims? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unpair All', 
          onPress: async () => {
            const success = await unpairAllDevices();
            if (success) {
              Alert.alert('Success', 'All rims have been unpaired.');
            } else {
              Alert.alert('Error', 'Failed to unpair all rims. Please try again.');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <LinearGradient
        colors={['#000000', '#12123e']}
        style={styles.background}
      >
        {/* Header */}
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Settings</Text>
        </View>
        
        <ScrollView style={styles.settingsContainer}>
          {/* Sensor Settings */}
          <View style={styles.settingSection}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Proximity sensor</Text>
              <Switch
                value={settings.proximityEnabled}
                onValueChange={() => handleSettingToggle('proximityEnabled')}
                trackColor={{ false: '#767577', true: '#4B69FF' }}
                thumbColor="#f4f3f4"
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Ambient sensor</Text>
              <Switch
                value={settings.ambientLightEnabled}
                onValueChange={() => handleSettingToggle('ambientLightEnabled')}
                trackColor={{ false: '#767577', true: '#4B69FF' }}
                thumbColor="#f4f3f4"
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Motion sensor</Text>
              <Switch
                value={settings.motionEnabled}
                onValueChange={() => handleSettingToggle('motionEnabled')}
                trackColor={{ false: '#767577', true: '#4B69FF' }}
                thumbColor="#f4f3f4"
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Twist Speed</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={25}
                  maximumValue={100}
                  step={5}
                  value={settings.twistSpeed}
                  onValueChange={(value) => saveSettings({ ...settings, twistSpeed: value })}
                  minimumTrackTintColor="#4B69FF"
                  maximumTrackTintColor="#767577"
                  thumbTintColor="#f4f3f4"
                />
                <Text style={styles.sliderValue}>{settings.twistSpeed}%</Text>
              </View>
            </View>
          </View>
          
          {/* Rim Pairing */}
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Pair & Assign Wheels</Text>
            
            <View style={styles.pairingRow}>
              <Text style={styles.positionLabel}>Front Driver</Text>
              {rimsState.frontDriver.connected ? (
                <View style={styles.pairedContainer}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.pairedText}>Connected</Text>
                  <TouchableOpacity
                    style={styles.unpairButton}
                    onPress={() => handleUnpair('frontDriver')}
                  >
                    <Text style={styles.unpairButtonText}>Unpair</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pairButton}
                  onPress={() => handlePairButtonPress('frontDriver')}
                >
                  <Text style={styles.pairButtonText}>Pair</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pairingRow}>
              <Text style={styles.positionLabel}>Front Passenger</Text>
              {rimsState.frontPassenger.connected ? (
                <View style={styles.pairedContainer}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.pairedText}>Connected</Text>
                  <TouchableOpacity
                    style={styles.unpairButton}
                    onPress={() => handleUnpair('frontPassenger')}
                  >
                    <Text style={styles.unpairButtonText}>Unpair</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pairButton}
                  onPress={() => handlePairButtonPress('frontPassenger')}
                >
                  <Text style={styles.pairButtonText}>Pair</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pairingRow}>
              <Text style={styles.positionLabel}>Rear Driver</Text>
              {rimsState.rearDriver.connected ? (
                <View style={styles.pairedContainer}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.pairedText}>Connected</Text>
                  <TouchableOpacity
                    style={styles.unpairButton}
                    onPress={() => handleUnpair('rearDriver')}
                  >
                    <Text style={styles.unpairButtonText}>Unpair</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pairButton}
                  onPress={() => handlePairButtonPress('rearDriver')}
                >
                  <Text style={styles.pairButtonText}>Pair</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pairingRow}>
              <Text style={styles.positionLabel}>Rear Passenger</Text>
              {rimsState.rearPassenger.connected ? (
                <View style={styles.pairedContainer}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.pairedText}>Connected</Text>
                  <TouchableOpacity
                    style={styles.unpairButton}
                    onPress={() => handleUnpair('rearPassenger')}
                  >
                    <Text style={styles.unpairButtonText}>Unpair</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pairButton}
                  onPress={() => handlePairButtonPress('rearPassenger')}
                >
                  <Text style={styles.pairButtonText}>Pair</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pairingRow}>
              <Text style={styles.positionLabel}>Aux</Text>
              {rimsState.aux.connected ? (
                <View style={styles.pairedContainer}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.pairedText}>Connected</Text>
                  <TouchableOpacity
                    style={styles.unpairButton}
                    onPress={() => handleUnpair('aux')}
                  >
                    <Text style={styles.unpairButtonText}>Unpair</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pairButton}
                  onPress={() => handlePairButtonPress('aux')}
                >
                  <Text style={styles.pairButtonText}>Pair</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.unpairAllButton}
              onPress={handleUnpairAll}
            >
              <Text style={styles.unpairAllButtonText}>Unpair All Rims</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
      
      {/* Pairing Modal */}
      <Modal
        visible={showPairingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPairingModal(false);
          stopScan();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Device to Pair</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowPairingModal(false);
                  stopScan();
                }}
              >
                <Ionicons name="close-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            {scanning ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#4B69FF" />
                <Text style={styles.scanningText}>Scanning for devices...</Text>
              </View>
            ) : (
              <>
                {scannedDevices.length === 0 ? (
                  <View style={styles.noDevicesContainer}>
                    <Text style={styles.noDevicesText}>No devices found</Text>
                    <TouchableOpacity
                      style={styles.scanButton}
                      onPress={startScan}
                    >
                      <Text style={styles.scanButtonText}>Scan Again</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={scannedDevices}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.deviceItem}
                        onPress={() => handleDeviceSelect(item)}
                      >
                        <Text style={styles.deviceName}>
                          {item.name || 'Unknown Device'}
                        </Text>
                        <Text style={styles.deviceId}>{item.id}</Text>
                      </TouchableOpacity>
                    )}
                    style={styles.deviceList}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Unpair Confirmation Modal */}
      <Modal
        visible={showUnpairConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Unpair Device</Text>
            <Text style={styles.modalText}>
              Are you sure you want to unpair this rim? You will need to pair it again to use it.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowUnpairConfirm(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmUnpair}
              >
                <Text style={styles.modalButtonText}>Unpair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Main Navigation
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Control') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Contact') {
            iconName = focused ? 'mail' : 'mail-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4B69FF',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Control" component={ControlScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Contact" component={ContactScreen} />
    </Tab.Navigator>
  );
};

// App Navigation
const AppNavigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Main App Component
const App = () => {
  return (
    <AppProvider>
      <AppNavigation />
    </AppProvider>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  // Splash Screen
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 250,
    height: 150,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  // Header
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerLogo: {
    width: 120,
    height: 40,
  },
  // Car Container
  carContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  carImage: {
    width: '80%',
    height: 350,
  },
  // Wheel Controls
  wheelControl: {
    position: 'absolute',
    alignItems: 'center',
    width: 70,
  },
  wheelLabel: {
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  wheelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  wheelButton: {
    backgroundColor: 'rgba(75, 105, 255, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  // Sync Button
  syncContainer: {
    alignItems: 'center',
    padding: 10,
  },
  syncText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 5,
  },
  syncButton: {
    backgroundColor: 'rgba(75, 105, 255, 0.8)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncIcon: {
    width: 40,
    height: 40,
  },
  // Bottom Controls
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  demoButton: {
    backgroundColor: 'rgba(75, 105, 255, 0.8)',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  demoButtonActive: {
    backgroundColor: 'rgba(255, 75, 75, 0.8)',
  },
  demoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    color: '#DDD',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '45%',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#444',
  },
  modalButtonConfirm: {
    backgroundColor: '#4B69FF',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalCloseButton: {
    padding: 5,
  },
  // Settings Screen
  settingsHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  settingsTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingLabel: {
    color: '#DDD',
    fontSize: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
  },
  slider: {
    flex: 1,
  },
  sliderValue: {
    color: '#DDD',
    width: 40,
    textAlign: 'right',
  },
  // Pairing
  pairingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  positionLabel: {
    color: '#DDD',
    fontSize: 16,
  },
  pairedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pairedText: {
    color: '#2ECC40',
    fontSize: 14,
    marginRight: 10,
    marginLeft: 5,
  },
  pairButton: {
    backgroundColor: '#4B69FF',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  pairButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unpairButton: {
    backgroundColor: '#555',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  unpairButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
  unpairAllButton: {
    backgroundColor: '#FF4136',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 20,
  },
  unpairAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Scanning
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  scanningText: {
    color: '#DDD',
    fontSize: 16,
    marginTop: 10,
  },
  noDevicesContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDevicesText: {
    color: '#DDD',
    fontSize: 16,
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#4B69FF',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceList: {
    width: '100%',
    maxHeight: 300,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  deviceName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    color: '#BBB',
    fontSize: 12,
  },
  // Contact Screen
  contactHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  contactTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactContainer: {
    flex: 1,
    padding: 20,
  },
  contactDescription: {
    color: '#DDD',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 5,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    color: '#FFF',
    fontSize: 16,
    padding: 12,
    width: '100%',
  },
  textAreaInput: {
    height: 150,
  },
  formNote: {
    color: '#BBB',
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#4B69FF',
    borderRadius: 5,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default App;