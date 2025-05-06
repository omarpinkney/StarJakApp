// components/ConnectionIndicator.js
import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Connection status indicator dot
 * 
 * @param {boolean} connected - Connection status
 * @param {string} size - Indicator size ('small', 'medium', 'large')
 * @param {object} style - Additional style
 */
const ConnectionIndicator = ({ connected, size = 'medium', style }) => {
  const sizeValue = {
    small: 8,
    medium: 12,
    large: 16,
  }[size] || 12;
  
  return (
    <View 
      style={[
        styles.indicator, 
        { 
          backgroundColor: connected ? '#00AA00' : '#FF0000',
          width: sizeValue,
          height: sizeValue,
          borderRadius: sizeValue / 2,
        },
        style,
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  indicator: {
    marginHorizontal: 4,
  },
});

export default ConnectionIndicator;