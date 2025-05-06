// components/FormInput.js
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

/**
 * Form input field with label and error handling
 * 
 * @param {string} label - Input label
 * @param {string} value - Input value
 * @param {function} onChangeText - Text change handler
 * @param {string} placeholder - Input placeholder
 * @param {string} error - Error message
 * @param {boolean} required - Is field required
 * @param {object} props - Additional TextInput props
 */
const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required = false,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#777"
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  required: {
    color: '#FF0000',
  },
  input: {
    backgroundColor: '#222',
    color: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: {
    borderColor: '#FF0000',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 5,
  },
});

export default FormInput;