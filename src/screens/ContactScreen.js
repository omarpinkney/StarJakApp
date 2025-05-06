// screens/ContactScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import ScreenBackground component
import { ScreenBackground } from '../components';

// Import services
import { generateErrorLogs } from '../services/LogService';
import { sendSupportRequest } from '../services/ApiService';

const ContactScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate error logs
      const logs = await generateErrorLogs();
      
      // Send support request
      await sendSupportRequest({
        name,
        email,
        phone,
        message,
        date: new Date().toISOString(),
        logs,
      });
      
      // Show success alert
      Alert.alert(
        'Success',
        'Your message has been sent. We will get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to send support request:', error);
      
      Alert.alert(
        'Error',
        'Failed to send your message. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ScreenBackground><KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>
          Need help with your Star Jak system? Send us a message and we'll get back to you.
        </Text>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#777"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#777"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor="#777"
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue or question"
              placeholderTextColor="#777"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          
          <Text style={styles.noteText}>
            * Error logs will be automatically attached to help us diagnose your issue.
          </Text>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Icon name="send" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Send Message</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    color: '#CCC',
    fontSize: 16,
    marginBottom: 30,
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#222',
    color: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  messageInput: {
    height: 150,
    paddingTop: 12,
  },
  noteText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0055FF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  }
});

export default ContactScreen;