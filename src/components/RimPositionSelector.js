// components/RimPositionSelector.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { RIM_POSITIONS } from '../utils/constants';

/**
 * Component for selecting rim position during setup
 * 
 * @param {function} onSelect - Called when position is selected
 * @param {array} excludePositions - Positions to exclude from selection
 */
const RimPositionSelector = ({ onSelect, excludePositions = [] }) => {
  const availablePositions = Object.entries(RIM_POSITIONS)
    .filter(([key]) => !excludePositions.includes(key));
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Rim Position</Text>
      
      {availablePositions.map(([key, label]) => (
        <TouchableOpacity 
          key={key}
          style={styles.positionButton}
          onPress={() => onSelect(key)}
        >
          <Text style={styles.positionLabel}>{label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  positionButton: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  positionLabel: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default RimPositionSelector;