// screens/MainScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import ScreenBackground component
import { ScreenBackground } from '../components';

// Import services
import { 
  connectToRim, 
  sendCommand, 
  disconnectFromRim,
  subscribeToStatus,
  subscribeToSensor,
  startStatusMonitoring
} from '../services/BleService';
import { loadPairedRims, loadSensorSettings } from '../services/StorageService';

// Import constants
import { RIM_POSITIONS, COMMANDS } from '../utils/constants';

// Import assets
import CarTopView from '../assets/car-top-view.png';
import AllButton from '../assets/all-button.png';
import DemoButton from '../assets/demo-button.png';

const { width, height } = Dimensions.get('window');

const MainScreen = () => {
  const navigation = useNavigation();
  const [pairedRims, setPairedRims] = useState([]);
  const [connectedRims, setConnectedRims] = useState({});
  const [rimStatuses, setRimStatuses] = useState({});
  const [sensorData, setSensorData] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [mode, setMode] = useState('extend'); // 'extend', 'twist', 'both'
  const [demoActive, setDemoActive] = useState(false);
  const [proximityWarning, setProximityWarning] = useState(false);
  const [sensorSettings, setSensorSettings] = useState({
    motionSensor: false,
    proximitySensor: false,
    ambientSensor: false,
  });
  
  const demoTimer = useRef(null);
  const lastAutoAction = useRef({});
  const lastManualAction = useRef({});
  
  // Animation values for rims
  const rimAnimations = useRef({
    FRONT_DRIVER: new Animated.Value(0),
    FRONT_PASSENGER: new Animated.Value(0),
    REAR_DRIVER: new Animated.Value(0),
    REAR_PASSENGER: new Animated.Value(0),
    AUX_1: new Animated.Value(0),
    AUX_2: new Animated.Value(0),
    AUX_3: new Animated.Value(0),
    AUX_4: new Animated.Value(0),
  }).current;
  
  // Load paired rims on focus
  useFocusEffect(
    React.useCallback(() => {
      const loadRims = async () => {
        try {
          // Load paired rims
          const rims = await loadPairedRims();
          setPairedRims(rims);
          
          // Load sensor settings
          const settings = await loadSensorSettings();
          setSensorSettings(settings);
          
          // Connect to all rims in background
          connectToAllRims(rims);
        } catch (error) {
          console.error('Failed to load paired rims:', error);
        }
      };
      
      loadRims();
      
      // Clean up on unfocus
      return () => {
        // Disconnect from all rims
        Object.values(connectedRims).forEach(rim => {
          disconnectFromRim(rim);
        });
        setConnectedRims({});
        
        // Stop demo if active
        if (demoActive) {
          stopDemo();
        }
      };
    }, [])
  );
  
  // Effect for status monitoring
  useEffect(() => {
    // Set up status monitoring for connected rims
    const subscriptions = [];
    
    Object.entries(connectedRims).forEach(([position, rim]) => {
      const statusSubscription = subscribeToStatus(rim, (status) => {
        setRimStatuses(prevStatuses => ({
          ...prevStatuses,
          [position]: status
        }));
        
        // Animate rim based on status
        updateRimAnimation(position, status);
      });
      
      const sensorSubscription = subscribeToSensor(rim, (sensorValues) => {
        setSensorData(prevData => ({
          ...prevData,
          [position]: sensorValues
        }));
        
        // Handle proximity sensor if enabled
        if (sensorSettings.proximitySensor && sensorValues.proximity > 3000) {
          setProximityWarning(true);
        }
        
        // Handle ambient light sensor if enabled
        if (sensorSettings.ambientSensor) {
          handleAmbientLightAutomation(position, sensorValues.light);
        }
      });
      
      subscriptions.push(statusSubscription, sensorSubscription);
    });
    
    // Start monitoring status updates
    startStatusMonitoring();
    
    return () => {
      // Clean up subscriptions
      subscriptions.forEach(sub => sub && sub.remove());
    };
  }, [connectedRims, sensorSettings]);
  
  // Demo mode effect
  useEffect(() => {
    if (demoActive) {
      startDemo();
    } else {
      stopDemo();
    }
    
    return () => {
      stopDemo();
    };
  }, [demoActive]);
  
  // Connect to all paired rims
  const connectToAllRims = async (rims) => {
    setIsConnecting(true);
    
    try {
      const newConnectedRims = {};
      
      for (const rim of rims) {
        try {
          const connected = await connectToRim(rim);
          newConnectedRims[rim.position] = connected;
        } catch (error) {
          console.error(`Failed to connect to rim ${rim.position}:`, error);
        }
      }
      
      setConnectedRims(newConnectedRims);
    } catch (error) {
      console.error('Error connecting to rims:', error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Handle rim command
  const handleRimCommand = async (position, command) => {
    const rim = connectedRims[position];
    
    if (rim) {
      try {
        // Check for proximity warning if extending
        if (command === COMMANDS.EXTEND && 
            sensorSettings.proximitySensor && 
            sensorData[position]?.proximity > 3000) {
          // Show proximity warning
          Alert.alert(
            'Proximity Warning',
            'An obstruction was detected near this rim. Do you want to continue?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Continue',
                onPress: async () => {
                  Alert.alert(
                    'Are you sure?',
                    'Continuing may cause damage if there is an obstruction',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Yes, continue',
                        onPress: async () => {
                          await sendCommand(rim, command);
                          updateLastManualAction(position);
                        },
                      },
                    ]
                  );
                },
              },
              {
                text: 'Retract',
                onPress: async () => {
                  await sendCommand(rim, COMMANDS.RETRACT);
                  updateLastManualAction(position);
                },
              },
            ]
          );
        } else {
          // No warning needed, send command directly
          await sendCommand(rim, command);
          updateLastManualAction(position);
        }
      } catch (error) {
        console.error(`Failed to send command to rim ${position}:`, error);
      }
    }
  };
  
  // Handle all rims command
  const handleAllRimsCommand = async (command) => {
    for (const position of Object.keys(connectedRims)) {
      await handleRimCommand(position, command);
    }
  };
  
  // Update rim animation based on status
  const updateRimAnimation = (position, status) => {
    if (!status) return;
    
    let targetValue = 0;
    
    if (status.state === 'EXTENDING') {
      targetValue = 1;
    } else if (status.state === 'RETRACTING') {
      targetValue = 0;
    }
    
    Animated.timing(rimAnimations[position], {
      toValue: targetValue,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };
  
  // Update last manual action timestamp
  const updateLastManualAction = (position) => {
    lastManualAction.current[position] = new Date().getTime();
  };
  
  // Handle ambient light automation
  const handleAmbientLightAutomation = (position, lightValue) => {
    // Define thresholds
    const DAYLIGHT_THRESHOLD = 1000; // High value means bright
    const NIGHTTIME_THRESHOLD = 200; // Low value means dark
    const MANUAL_OVERRIDE_HOURS = 12; // 12 hours
    
    const now = new Date();
    const nowTime = now.getTime();
    const today = now.toDateString();
    
    // Get last actions
    const lastAction = lastAutoAction.current[position] || {};
    const lastManualTime = lastManualAction.current[position] || 0;
    
    // Check if manual override is active
    const manualOverrideActive = (nowTime - lastManualTime) < (MANUAL_OVERRIDE_HOURS * 60 * 60 * 1000);
    
    if (manualOverrideActive) {
      // Manual override is active, don't take automatic action
      return;
    }
    
    try {
      if (lightValue > DAYLIGHT_THRESHOLD &&
          (lastAction.type !== 'EXTEND' || lastAction.date !== today)) {
        // It's daylight and we haven't extended today
        handleRimCommand(position, COMMANDS.EXTEND);
        
        // Update last action
        lastAutoAction.current[position] = {
          type: 'EXTEND',
          date: today,
          timestamp: nowTime
        };
      } else if (lightValue < NIGHTTIME_THRESHOLD &&
                (lastAction.type !== 'RETRACT' || lastAction.date !== today)) {
        // It's nighttime and we haven't retracted today
        handleRimCommand(position, COMMANDS.RETRACT);
        
        // Update last action
        lastAutoAction.current[position] = {
          type: 'RETRACT',
          date: today,
          timestamp: nowTime
        };
      }
    } catch (error) {
      console.error('Failed to handle ambient light automation:', error);
    }
  };
  
  // Toggle mode
  const toggleMode = () => {
    setMode(current => {
      if (current === 'extend') return 'twist';
      if (current === 'twist') return 'both';
      return 'extend';
    });
  };
  
  // Start demo mode
  const startDemo = () => {
    // Start a sequence of random rim movements
    const performRandomAction = () => {
      if (!demoActive) return;
      
      const positions = Object.keys(connectedRims);
      if (positions.length === 0) return;
      
      // Choose random position or all
      const targetPosition = Math.random() < 0.3 ? 'all' : positions[Math.floor(Math.random() * positions.length)];
      
      // Choose random command
      const commands = [COMMANDS.EXTEND, COMMANDS.RETRACT, COMMANDS.ROTATE_CW, COMMANDS.ROTATE_CCW];
      const randomCommand = commands[Math.floor(Math.random() * commands.length)];
      
      // Execute command
      if (targetPosition === 'all') {
        handleAllRimsCommand(randomCommand);
      } else {
        handleRimCommand(targetPosition, randomCommand);
      }
      
      // Schedule next action
      const delay = 2000 + Math.random() * 3000; // 2-5 seconds
      demoTimer.current = setTimeout(performRandomAction, delay);
    };
    
    // Start the sequence
    performRandomAction();
  };
  
  // Stop demo mode
  const stopDemo = () => {
    if (demoTimer.current) {
      clearTimeout(demoTimer.current);
      demoTimer.current = null;
    }
    
    // Stop all motors
    handleAllRimsCommand(COMMANDS.STOP);
  };
  
  // Render rim control
  const renderRimControl = (position, label, coords) => {
    const isConnected = !!connectedRims[position];
    const status = rimStatuses[position] || { state: 'UNKNOWN' };
    
    // Determine color based on connection status
    const connectionColor = isConnected ? '#00AA00' : '#FF0000';
    
    // Determine icon based on mode
    let extendIcon = 'arrow-up-bold';
    let retractIcon = 'arrow-down-bold';
    let rotateCWIcon = 'rotate-right';
    let rotateCCWIcon = 'rotate-left';
    
    return (
      <View style={[styles.rimControl, { left: coords.x, top: coords.y }]}>
        <Text style={styles.rimLabel}>{label}</Text>
        
        <View style={styles.rimConnectionStatus}>
          <View style={[styles.connectionDot, { backgroundColor: connectionColor }]} />
        </View>
        
        {isConnected && (
          <View style={styles.rimButtons}>
            {(mode === 'extend' || mode === 'both') && (
              <>
                <TouchableOpacity 
                  style={styles.rimButton}
                  onPress={() => handleRimCommand(position, COMMANDS.EXTEND)}
                >
                  <Icon name={extendIcon} size={20} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.rimButton}
                  onPress={() => handleRimCommand(position, COMMANDS.RETRACT)}
                >
                  <Icon name={retractIcon} size={20} color="#FFF" />
                </TouchableOpacity>
              </>
            )}
            
            {(mode === 'twist' || mode === 'both') && (
              <>
                <TouchableOpacity 
                  style={styles.rimButton}
                  onPress={() => handleRimCommand(position, COMMANDS.ROTATE_CW)}
                >
                  <Icon name={rotateCWIcon} size={20} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.rimButton}
                  onPress={() => handleRimCommand(position, COMMANDS.ROTATE_CCW)}
                >
                  <Icon name={rotateCCWIcon} size={20} color="#FFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };
  
  // Render auxiliary rim indicators for more than 4 rims
  const renderAuxRimIndicators = () => {
    if (pairedRims.length <= 4) return null;
    
    const auxRims = pairedRims.filter(rim => 
      ['AUX_1', 'AUX_2', 'AUX_3', 'AUX_4'].includes(rim.position)
    );
    
    if (auxRims.length === 0) return null;
    
    return (
      <View style={styles.auxRimIndicators}>
        {auxRims.map((rim) => {
          const isConnected = !!connectedRims[rim.position];
          const connectionColor = isConnected ? '#00AA00' : '#FF0000';
          
          return (
            <TouchableOpacity 
              key={rim.position}
              style={styles.auxRimIndicator}
              onPress={() => {
                // Toggle extension for aux rim
                if (isConnected) {
                  const status = rimStatuses[rim.position];
                  const command = 
                    status && status.state === 'EXTENDING' ? 
                    COMMANDS.RETRACT : COMMANDS.EXTEND;
                  
                  handleRimCommand(rim.position, command);
                }
              }}
            >
              <View style={[styles.auxRimDot, { backgroundColor: connectionColor }]} />
              <Text style={styles.auxRimLabel}>{RIM_POSITIONS[rim.position]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // UPDATED RETURN STATEMENT WITH SCREENBACKGROUND
  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/images/star-jak-logo.png')} style={styles.logo} />
          <Text style={styles.title}>STAR JAK</Text>
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="cog" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modeSelector}>
          <Text style={styles.modeLabel}>Mode:</Text>
          <TouchableOpacity 
            style={[
              styles.modeButton,
              mode === 'extend' && styles.activeMode
            ]}
            onPress={() => setMode('extend')}
          >
            <Text style={styles.modeButtonText}>Extend</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.modeButton,
              mode === 'twist' && styles.activeMode
            ]}
            onPress={() => setMode('twist')}
          >
            <Text style={styles.modeButtonText}>Twist</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.modeButton,
              mode === 'both' && styles.activeMode
            ]}
            onPress={() => setMode('both')}
          >
            <Text style={styles.modeButtonText}>Both</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.carContainer}>
          <Image source={CarTopView} style={styles.carImage} />
          
          <TouchableOpacity 
            style={styles.allButton}
            onPress={() => handleAllRimsCommand(COMMANDS.EXTEND)}
            onLongPress={() => handleAllRimsCommand(COMMANDS.RETRACT)}
          >
            <Image source={AllButton} style={styles.allButtonImage} />
          </TouchableOpacity>
          
          {/* Rim controls positioned around the car */}
          {renderRimControl('FRONT_DRIVER', 'Front Left', { x: width * 0.15, y: height * 0.25 })}
          {renderRimControl('FRONT_PASSENGER', 'Front Right', { x: width * 0.75, y: height * 0.25 })}
          {renderRimControl('REAR_DRIVER', 'Rear Left', { x: width * 0.15, y: height * 0.45 })}
          {renderRimControl('REAR_PASSENGER', 'Rear Right', { x: width * 0.75, y: height * 0.45 })}
        </View>
        
        {renderAuxRimIndicators()}
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate('Contact')}
          >
            <Icon name="email-outline" size={24} color="#FFF" />
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.demoButton,
              demoActive && styles.demoActiveButton
            ]}
            onPress={() => setDemoActive(!demoActive)}
          >
            <Image source={DemoButton} style={styles.demoButtonImage} />
            <Text style={styles.demoButtonText}>
              {demoActive ? 'Stop Demo' : 'Demo'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Proximity Warning Modal */}
        <Modal
          visible={proximityWarning}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.warningModal}>
              <Icon name="alert-circle" size={60} color="#FF0000" />
              <Text style={styles.warningTitle}>Proximity Warning</Text>
              <Text style={styles.warningText}>
                An obstruction was detected near one of your rims.
              </Text>
              
              <View style={styles.warningButtons}>
                <TouchableOpacity 
                  style={[styles.warningButton, styles.cancelButton]}
                  onPress={() => setProximityWarning(false)}
                >
                  <Text style={styles.warningButtonText}>Dismiss</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.warningButton, styles.retractButton]}
                  onPress={() => {
                    handleAllRimsCommand(COMMANDS.RETRACT);
                    setProximityWarning(false);
                  }}
                >
                  <Text style={styles.warningButtonText}>Retract All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenBackground>
  );
};

// UPDATED STYLES - REMOVED BACKGROUND COLOR FROM CONTAINER
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#000', // Removed this line
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: 10,
  },
  modeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modeLabel: {
    color: '#FFF',
    marginRight: 10,
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#222',
    marginHorizontal: 5,
  },
  activeMode: {
    backgroundColor: '#0055FF',
  },
  modeButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  carContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  carImage: {
    width: width * 0.7,
    height: height * 0.3,
    resizeMode: 'contain',
  },
  allButton: {
    position: 'absolute',
    top: height * 0.35,
    alignItems: 'center',
  },
  allButtonImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  rimControl: {
    position: 'absolute',
    alignItems: 'center',
  },
  rimLabel: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 5,
  },
  rimConnectionStatus: {
    marginBottom: 5,
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rimButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 80,
  },
  rimButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  auxRimIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  auxRimIndicator: {
    alignItems: 'center',
  },
  auxRimDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 5,
  },
  auxRimLabel: {
    color: '#FFF',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#FFF',
    marginLeft: 10,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  demoActiveButton: {
    backgroundColor: '#AA0000',
  },
  demoButtonImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 10,
  },
  demoButtonText: {
    color: '#FFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningModal: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    width: width * 0.8,
    alignItems: 'center',
  },
  warningTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  warningText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  warningButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  warningButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  retractButton: {
    backgroundColor: '#AA0000',
  },
  warningButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MainScreen;