// components/StatusBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Status badge to show rim state
 * 
 * @param {string} status - Status value
 */
const StatusBadge = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'IDLE':
        return '#999';
      case 'EXTENDING':
        return '#0055FF';
      case 'RETRACTING':
        return '#FF9900';
      case 'ROTATING_CW':
        return '#9900FF';
      case 'ROTATING_CCW':
        return '#00AA00';
      case 'ERROR':
        return '#FF0000';
      default:
        return '#999';
    }
  };
  
  const getStatusLabel = () => {
    switch (status) {
      case 'IDLE':
        return 'Idle';
      case 'EXTENDING':
        return 'Extending';
      case 'RETRACTING':
        return 'Retracting';
      case 'ROTATING_CW':
        return 'Rotating CW';
      case 'ROTATING_CCW':
        return 'Rotating CCW';
      case 'ERROR':
        return 'Error';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <View 
      style={[
        styles.badge,
        { backgroundColor: getStatusColor() }
      ]}
    >
      <Text style={styles.badgeText}>{getStatusLabel()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default StatusBadge;