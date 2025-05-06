// components/SettingToggle.js
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';

/**
 * Toggle switch setting with label and description
 * 
 * @param {string} title - Setting title
 * @param {string} description - Setting description
 * @param {boolean} value - Toggle value
 * @param {function} onValueChange - Toggle change handler
 */
const SettingToggle = ({ title, description, value, onValueChange }) => {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#444', true: '#4CAF50' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 5,
  },
  description: {
    color: '#999',
    fontSize: 14,
  },
});

export default SettingToggle;