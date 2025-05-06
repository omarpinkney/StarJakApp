// screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import services
import { loadPairedRims, saveSensorSettings, loadSensorSettings, clearAllPairedRims } from '../services/StorageService';

// Import constants
import { RIM_POSITIONS } from '../utils/constants';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [pairedRims, setPairedRims] = useState([]);
  const [motionSensorEnabled, setMotionSensorEnabled] = useState(false);
  const [proximitySensorEnabled, setProximitySensorEnabled] = useState(false);
  const [ambientSensorEnabled, setAmbientSensorEnabled] = useState(false);
  
  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load paired rims
        const rims = await loadPairedRims();
        setPairedRims(rims);
        
        // Load sensor settings
        const settings = await loadSensorSettings();
        setMotionSensorEnabled(settings.motionSensor || false);
        setProximitySensorEnabled(settings.proximitySensor || false);
        setAmbientSensorEnabled(settings.ambientSensor || false);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Save sensor settings when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await saveSensorSettings({
          motionSensor: motionSensorEnabled,
          proximitySensor: proximitySensorEnabled,
          ambientSensor: ambientSensorEnabled,
        });
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    };
    
    saveSettings();
  }, [motionSensorEnabled, proximitySensorEnabled, ambientSensorEnabled]);
  
  // Handle unpair all rims
  const handleUnpairAll = () => {
    Alert.alert(
      'Unpair All Rims',
      'Are you sure you want to unpair all rims? This will remove all paired rims from the app.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unpair All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllPairedRims();
              setPairedRims([]);
              
              // Navigate back to setup
              navigation.reset({
                index: 0,
                routes: [{ name: 'SetupWizard' }],
              });
            } catch (error) {
              console.error('Failed to unpair all rims:', error);
            }
          },
        },
      ]
    );
  };
  
  return (
    <ScreenBackground>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensor Controls</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Motion sensor</Text>
              <Text style={styles.settingDescription}>
                Detect motion near your vehicle and notify the app
              </Text>
            </View>
            <Switch
              value={motionSensorEnabled}
              onValueChange={setMotionSensorEnabled}
              trackColor={{ false: '#444', true: '#4CAF50' }}
              thumbColor={motionSensorEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Proximity sensor</Text>
              <Text style={styles.settingDescription}>
                Warn when obstacles are detected before extending rims
              </Text>
            </View>
            <Switch
              value={proximitySensorEnabled}
              onValueChange={setProximitySensorEnabled}
              trackColor={{ false: '#444', true: '#4CAF50' }}
              thumbColor={proximitySensorEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Ambient light sensor</Text>
              <Text style={styles.settingDescription}>
                Automatically extend/retract rims based on light levels
              </Text>
            </View>
            <Switch
              value={ambientSensorEnabled}
              onValueChange={setAmbientSensorEnabled}
              trackColor={{ false: '#444', true: '#4CAF50' }}
              thumbColor={ambientSensorEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paired Rims</Text>
          
          {pairedRims.length > 0 ? (
            pairedRims.map((rim) => (
              <View key={rim.id} style={styles.pairedRim}>
                <View style={styles.pairedRimInfo}>
                  <Text style={styles.pairedRimPosition}>
                    {RIM_POSITIONS[rim.position]}
                  </Text>
                  <Text style={styles.pairedRimName}>{rim.name}</Text>
                </View>
                <Icon name="bluetooth" size={24} color="#0055FF" />
              </View>
            ))
          ) : (
            <Text style={styles.noRimsText}>No rims paired</Text>
          )}
          
          <TouchableOpacity 
            style={styles.unpairAllButton}
            onPress={handleUnpairAll}
            disabled={pairedRims.length === 0}
          >
            <Icon name="bluetooth-off" size={20} color="#FFF" />
            <Text style={styles.unpairAllButtonText}>Unpair All Rims</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <Text style={styles.aboutText}>
            Star Jak Interactive Rim System
          </Text>
          <Text style={styles.versionText}>
            App Version: 1.0.0
          </Text>
          <Text style={styles.versionText}>
            Firmware Version: 1.0.0
          </Text>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => navigation.navigate('Contact')}
        >
          <Icon name="email-outline" size={24} color="#FFF" />
          <Text style={styles.contactButtonText}>Contact Us</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 5,
  },
  settingDescription: {
    color: '#999',
    fontSize: 14,
  },
  pairedRim: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  pairedRimInfo: {
    flex: 1,
  },
  pairedRimPosition: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pairedRimName: {
    color: '#BBB',
    fontSize: 14,
  },
  noRimsText: {
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  unpairAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#AA0000',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  unpairAllButtonText: {
    color: '#FFF',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  aboutText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  versionText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#FFF',
    marginLeft: 10,
  },
});

export default SettingsScreen;