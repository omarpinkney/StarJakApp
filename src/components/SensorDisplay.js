// components/SensorDisplay.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Component to display sensor data
 * 
 * @param {object} sensorData - Sensor data (proximity, light, motion)
 */
const SensorDisplay = ({ sensorData }) => {
  const { proximity, light, motion } = sensorData || {};
  
  const getProximityLevel = () => {
    if (!proximity) return 'none';
    if (proximity > 3000) return 'high';
    if (proximity > 1500) return 'medium';
    return 'low';
  };
  
  const getLightLevel = () => {
    if (!light) return 'none';
    if (light > 1000) return 'high';
    if (light > 200) return 'medium';
    return 'low';
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sensor Data</Text>
      
      <View style={styles.sensorRow}>
        <Icon name="ruler" size={20} color="#FFF" />
        <Text style={styles.sensorLabel}>Proximity:</Text>
        <View 
          style={[
            styles.levelIndicator, 
            styles[`${getProximityLevel()}Level`]
          ]} 
        />
        <Text style={styles.sensorValue}>
          {proximity !== undefined ? proximity : 'N/A'}
        </Text>
      </View>
      
      <View style={styles.sensorRow}>
        <Icon name="white-balance-sunny" size={20} color="#FFF" />
        <Text style={styles.sensorLabel}>Light:</Text>
        <View 
          style={[
            styles.levelIndicator, 
            styles[`${getLightLevel()}Level`]
          ]} 
        />
        <Text style={styles.sensorValue}>
          {light !== undefined ? light : 'N/A'}
        </Text>
      </View>
      
      <View style={styles.sensorRow}>
        <Icon name="motion-sensor" size={20} color="#FFF" />
        <Text style={styles.sensorLabel}>Motion:</Text>
        <Text 
          style={[
            styles.sensorValue,
            motion ? styles.motionActive : styles.motionInactive
          ]}
        >
          {motion ? 'Detected' : 'None'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  sensorLabel: {
    color: '#CCC',
    fontSize: 14,
    marginLeft: 10,
    width: 80,
  },
  sensorValue: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 10,
  },
  levelIndicator: {
    width: 50,
    height: 6,
    borderRadius: 3,
  },
  noneLine: {
    backgroundColor: '#444',
  },
  lowLevel: {
    backgroundColor: '#00AA00',
  },
  mediumLevel: {
    backgroundColor: '#FF9900',
  },
  highLevel: {
    backgroundColor: '#FF0000',
  },
  motionActive: {
    color: '#FF9900',
    fontWeight: 'bold',
  },
  motionInactive: {
    color: '#999',
  },
});

export default SensorDisplay;