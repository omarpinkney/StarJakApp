// components/Button.js
import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Button component with icon support and loading state
 * 
 * @param {string} text - Button text
 * @param {string} iconName - Optional Material Community icon name
 * @param {function} onPress - Button press handler
 * @param {string} type - Button type (primary, secondary, danger)
 * @param {boolean} loading - Show loading indicator
 * @param {boolean} disabled - Disable button
 * @param {object} style - Additional style for the button
 * @param {object} textStyle - Additional style for the button text
 */
const Button = ({
  text,
  iconName,
  onPress,
  type = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const getButtonStyle = () => {
    switch (type) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'danger':
        return styles.dangerButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'danger':
        return styles.dangerText;
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          {iconName && (
            <Icon 
              name={iconName} 
              size={20} 
              color={type === 'secondary' ? '#0055FF' : '#FFF'} 
              style={styles.icon} 
            />
          )}
          <Text style={[styles.text, getTextStyle(), textStyle]}>{text}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#0055FF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0055FF',
  },
  dangerButton: {
    backgroundColor: '#AA0000',
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryText: {
    color: '#FFF',
  },
  secondaryText: {
    color: '#0055FF',
  },
  dangerText: {
    color: '#FFF',
  },
  icon: {
    marginRight: 8,
  },
});

export default Button;