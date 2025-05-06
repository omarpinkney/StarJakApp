// components/ScreenBackground.js
import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

const ScreenBackground = ({ children, style }) => {
  return (
    <ImageBackground 
      source={require('../assets/images/main-bg.png')} 
      style={[styles.background, style]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default ScreenBackground;