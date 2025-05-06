// components/LoadingOverlay.js
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

/**
 * Fullscreen loading overlay
 * 
 * @param {boolean} visible - Is overlay visible
 * @param {string} message - Optional message to display
 */
const LoadingOverlay = ({ visible, message = 'Loading...' }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.container}>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0055FF" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    minWidth: 200,
  },
  message: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default LoadingOverlay;