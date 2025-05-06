// components/Header.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

/**
 * Application header with back button, title and optional right action
 * 
 * @param {string} title - Header title
 * @param {boolean} showBack - Show back button
 * @param {function} onBackPress - Optional custom back handler
 * @param {component} rightComponent - Optional component to show on the right
 * @param {boolean} showLogo - Show app logo
 */
const Header = ({ 
  title, 
  showBack = false, 
  onBackPress, 
  rightComponent,
  showLogo = false,
}) => {
  const navigation = useNavigation();
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };
  
  return (
    <View style={styles.header}>
      {showBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
      
      <View style={styles.titleContainer}>
        {showLogo && (
          <Image 
            source={require('../assets/star-jak-logo.png')} 
            style={styles.logo} 
          />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      
      {rightComponent ? (
        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#000',
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  rightContainer: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  rightPlaceholder: {
    width: 44,
  },
});

export default Header;