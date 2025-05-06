// screens/LoadingScreen.js
import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Import the Star Jak logo from assets
import StarJakLogo from '../assets/star-jak-logo.png';
import { ScreenBackground } from '../components';

const LoadingScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Simulating loading time
    const timer = setTimeout(() => {
      // This will be replaced with actual initialization in App.js
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <ScreenBackground>
    <View style={styles.container}>
      <Image source={StarJakLogo} style={styles.logo} />
      <Text style={styles.title}>STAR JAK</Text>
      <Text style={styles.subtitle}>Interactive Rim System</Text>
      <ActivityIndicator 
        size="large" 
        color="#0055FF" 
        style={styles.loader} 
      />
    </View>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#0055FF',
    marginTop: 10,
  },
  loader: {
    marginTop: 50,
  },
});

export default LoadingScreen;