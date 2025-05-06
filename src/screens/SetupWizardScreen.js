// screens/SetupWizardScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Modal,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import services
import { 
  scanForDevices, 
  connectToDevice, 
  sendCommand, 
  disconnectFromDevice 
} from '../services/BleService';
import { savePairedRim, savePairedRims } from '../services/StorageService';

// Import constants
import { RIM_POSITIONS, COMMANDS } from '../utils/constants';

const SetupWizardScreen = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [pairedRims, setPairedRims] = useState([]);
  const [numRimsToConnect, setNumRimsToConnect] = useState(4);
  const [currentRimIndex, setCurrentRimIndex] = useState(0);

  // Steps for the wizard
  const steps = [
    { title: 'Welcome', description: 'Set up your Star Jak Rim System' },
    { title: 'Select Number of Rims', description: 'How many rims do you want to connect?' },
    { title: 'Connect Rim', description: 'Select a rim to connect' },
    { title: 'Assign Position', description: 'Which position is this rim?' },
    { title: 'Complete', description: 'Setup Complete!' },
  ];

  // Effect for device scanning
  useEffect(() => {
    if (scanning) {
      const scanSubscription = scanForDevices((device) => {
        // Only add devices that are advertising as Star Jak
        if (device.name && device.name.includes('Star Jak')) {
          setDiscoveredDevices(prev => {
            // Check if device already exists in list
            if (!prev.find(d => d.id === device.id)) {
              return [...prev, device];
            }
            return prev;
          });
        }
      });
      
      // Stop scanning after 10 seconds
      const timer = setTimeout(() => {
        scanSubscription.remove();
        setScanning(false);
      }, 10000);
      
      return () => {
        scanSubscription.remove();
        clearTimeout(timer);
      };
    }
  }, [scanning]);

  // Handle next step button
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete setup and navigate to main screen
      finishSetup();
    }
  };

  // Handle back button
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Start scanning for devices
  const startScan = () => {
    setDiscoveredDevices([]);
    setScanning(true);
  };

  // Connect to a selected device
  const connectToSelectedDevice = async (device) => {
    setConnecting(true);
    setSelectedDevice(device);
    
    try {
      const connected = await connectToDevice(device);
      setConnectedDevice(connected);
      
      // After connecting, send EXTEND command to identify the rim
      await sendCommand(connected, COMMANDS.EXTEND);
      
      // Move to next step
      setCurrentStep(3); // Assign position step
    } catch (error) {
      console.error('Failed to connect:', error);
      setSelectedDevice(null);
    } finally {
      setConnecting(false);
    }
  };

  // Assign position to connected rim
  const assignPosition = async (position) => {
    setSelectedPosition(position);
    
    try {
      // Send RETRACT command
      await sendCommand(connectedDevice, COMMANDS.RETRACT);
      
      // Store the paired rim
      const newRim = {
        id: connectedDevice.id,
        name: connectedDevice.name || 'Star Jak Rim',
        position: position,
        serviceUUID: connectedDevice.serviceUUIDs[0],
      };
      
      // Add to paired rims
      const updatedRims = [...pairedRims, newRim];
      setPairedRims(updatedRims);
      
      // Save to storage
      await savePairedRim(newRim);
      
      // Disconnect from the device
      await disconnectFromDevice(connectedDevice);
      
      setConnectedDevice(null);
      setSelectedDevice(null);
      
      // Check if we need to pair more rims
      if (pairedRims.length + 1 < numRimsToConnect) {
        setCurrentRimIndex(currentRimIndex + 1);
        setCurrentStep(2); // Back to connect step
      } else {
        // All rims paired, move to complete step
        setCurrentStep(4);
      }
    } catch (error) {
      console.error('Error assigning position:', error);
    }
  };

  // Complete setup
  const finishSetup = async () => {
    // Save all paired rims one last time
    await savePairedRims(pairedRims);
    
    // Navigate to main screen
    navigation.replace('Main');
  };

  // Render different content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <View style={styles.stepContent}>
            <Icon name="car-wrench" size={80} color="#0055FF" />
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepDescription}>{steps[currentStep].description}</Text>
            <Text style={styles.instructions}>
              Welcome to the Star Jak Rim System setup wizard. This will guide you through connecting and configuring your rims.
            </Text>
          </View>
        );
        
      case 1: // Select number of rims
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepDescription}>{steps[currentStep].description}</Text>
            
            <View style={styles.rimNumberSelector}>
              {[4, 5, 6, 7, 8].map((num) => (
                <TouchableOpacity 
                  key={num}
                  style={[
                    styles.rimNumberButton,
                    numRimsToConnect === num && styles.rimNumberSelected
                  ]}
                  onPress={() => setNumRimsToConnect(num)}
                >
                  <Text style={[
                    styles.rimNumberText,
                    numRimsToConnect === num && styles.rimNumberTextSelected
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.instructions}>
              Select how many Star Jak rims you want to connect. The standard configuration is 4 rims.
            </Text>
          </View>
        );
        
      case 2: // Connect rim
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepDescription}>
              {`Rim ${currentRimIndex + 1} of ${numRimsToConnect}: ${steps[currentStep].description}`}
            </Text>
            
            {scanning ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#0055FF" />
                <Text style={styles.scanningText}>Scanning for Star Jak rims...</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={startScan}
              >
                <Icon name="bluetooth-search" size={24} color="#FFF" />
                <Text style={styles.scanButtonText}>Scan for Rims</Text>
              </TouchableOpacity>
            )}
            
            {discoveredDevices.length > 0 && (
              <FlatList
                data={discoveredDevices}
                keyExtractor={(item) => item.id}
                style={styles.deviceList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.deviceItem}
                    onPress={() => connectToSelectedDevice(item)}
                    disabled={connecting}
                  >
                    <Icon 
                      name={connecting && selectedDevice?.id === item.id ? "bluetooth-connect" : "bluetooth"} 
                      size={24} 
                      color="#0055FF" 
                    />
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{item.name || 'Unnamed Device'}</Text>
                      <Text style={styles.deviceId}>{item.id}</Text>
                    </View>
                    {connecting && selectedDevice?.id === item.id && (
                      <ActivityIndicator size="small" color="#0055FF" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            
            {!scanning && discoveredDevices.length === 0 && (
              <Text style={styles.noDevicesText}>
                No Star Jak rims found. Make sure your rims are powered on and in range.
              </Text>
            )}
          </View>
        );
        
      case 3: // Assign position
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepDescription}>
              {`Rim ${currentRimIndex + 1} of ${numRimsToConnect}: ${steps[currentStep].description}`}
            </Text>
            
            <Text style={styles.instructions}>
              A rim has been extended. Select the position where this rim is located on your vehicle.
            </Text>
            
            <View style={styles.positionSelector}>
              {Object.entries(RIM_POSITIONS)
                .filter(([key]) => {
                  // Filter out positions that are already assigned
                  return !pairedRims.some(rim => rim.position === key);
                })
                .map(([key, label]) => (
                  <TouchableOpacity 
                    key={key}
                    style={styles.positionButton}
                    onPress={() => assignPosition(key)}
                  >
                    <Text style={styles.positionButtonText}>{label}</Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          </View>
        );
        
      case 4: // Complete
        return (
          <View style={styles.stepContent}>
            <Icon name="check-circle" size={80} color="#00AA00" />
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepDescription}>{steps[currentStep].description}</Text>
            
            <Text style={styles.instructions}>
              {`You have successfully paired ${pairedRims.length} Star Jak rims to your vehicle. Press Complete to start using your Star Jak Rim System.`}
            </Text>
            
            <View style={styles.rimSummary}>
              {pairedRims.map((rim, index) => (
                <View key={index} style={styles.rimSummaryItem}>
                  <Icon name="checkbox-marked-circle" size={24} color="#00AA00" />
                  <Text style={styles.rimSummaryText}>
                    {RIM_POSITIONS[rim.position]} - {rim.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Star Jak Setup</Text>
        <View style={styles.stepIndicator}>
          {steps.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.stepDot, 
                currentStep === index ? styles.activeStepDot : null,
                currentStep > index ? styles.completedStepDot : null
              ]} 
            />
          ))}
        </View>
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {renderStepContent()}
      </ScrollView>
      
      <View style={styles.footer}>
        {currentStep > 0 && currentStep < 4 && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Icon name="arrow-left" size={24} color="#FFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
          disabled={
            (currentStep === 1 && numRimsToConnect === 0) ||
            (currentStep === 2 && !connectedDevice) ||
            (currentStep === 3 && !selectedPosition)
          }
        >
          <Text style={styles.nextButtonText}>
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
          </Text>
          <Icon 
            name={currentStep === steps.length - 1 ? "check" : "arrow-right"} 
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#444',
    marginHorizontal: 5,
  },
  activeStepDot: {
    backgroundColor: '#0055FF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  completedStepDot: {
    backgroundColor: '#00AA00',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContent: {
    alignItems: 'center',
    minHeight: 300,
  },
  stepTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    color: '#BBB',
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  instructions: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  backButtonText: {
    color: '#FFF',
    marginLeft: 10,
    fontSize: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#0055FF',
    flex: 1,
    justifyContent: 'center',
    marginLeft: 10,
  },
  nextButtonText: {
    color: '#FFF',
    marginRight: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Device scanning styles
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#0055FF',
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#FFF',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanningContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scanningText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
  },
  deviceList: {
    width: '100%',
    maxHeight: 300,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#222',
    marginBottom: 10,
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 15,
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
  noDevicesText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  // Number selector styles
  rimNumberSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  rimNumberButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  rimNumberSelected: {
    backgroundColor: '#0055FF',
  },
  rimNumberText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rimNumberTextSelected: {
    color: '#FFF',
  },
  // Position selector styles
  positionSelector: {
    width: '100%',
  },
  positionButton: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  positionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Summary styles
  rimSummary: {
    width: '100%',
    marginTop: 20,
  },
  rimSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 10,
  },
  rimSummaryText: {
    color: '#FFF',
    marginLeft: 10,
    fontSize: 16,
  }
});

export default SetupWizardScreen;