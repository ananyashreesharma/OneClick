// 🚪 Authentication Screen - The front door to your app
// This is what users see when they first open the app or need to log in

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { registerUser, loginUser, resetPassword } from '../services/authService';

const AuthScreen = ({ onAuthSuccess }) => {
  // 📝 State variables - like keeping track of what the user is typing
  const [isLogin, setIsLogin] = useState(true); // 🔄 Toggle between login and signup
  const [email, setEmail] = useState(''); // 📧 User's email address
  const [password, setPassword] = useState(''); // 🔐 User's password
  const [confirmPassword, setConfirmPassword] = useState(''); // 🔐 Password confirmation for signup
  const [name, setName] = useState(''); // 👤 User's name (for signup)
  const [isLoading, setIsLoading] = useState(false); // ⏳ Shows loading spinner when processing
  const [showPassword, setShowPassword] = useState(false); // 👁️ Toggle password visibility

  // 🔑 Handle login - when user clicks the "Login" button
  const handleLogin = async () => {
    // 🧹 Clean up the input (remove extra spaces)
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // ✅ Check if user filled in everything
    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Oops!', 'Please fill in both email and password.');
      return;
    }

    // 📧 Check if email looks like a real email
    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true); // ⏳ Show loading spinner

    try {
      // 🎯 Try to log the user in
      const result = await loginUser(cleanEmail, cleanPassword);
      
      if (result.success) {
        // 🎉 Login successful! Tell the main app
        onAuthSuccess(result.user);
      } else {
        // 😅 Login failed, show the error message
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      // 😱 Something unexpected happened
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false); // ✅ Hide loading spinner
    }
  };

  // 🆔 Handle signup - when user clicks the "Sign Up" button
  const handleSignup = async () => {
    // 🧹 Clean up all the inputs
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();
    const cleanName = name.trim();

    // ✅ Check if user filled in everything
    if (!cleanEmail || !cleanPassword || !cleanConfirmPassword || !cleanName) {
      Alert.alert('Oops!', 'Please fill in all fields.');
      return;
    }

    // 📧 Check if email looks like a real email
    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // 🔐 Check if passwords match
    if (cleanPassword !== cleanConfirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    // 🔒 Check if password is strong enough
    if (cleanPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true); // ⏳ Show loading spinner

    try {
      // 🎯 Try to create the new account
      const result = await registerUser(cleanEmail, cleanPassword, cleanName);
      
      if (result.success) {
        // 🎉 Signup successful! Tell the main app
        onAuthSuccess(result.user);
        Alert.alert('Welcome!', `Hi ${cleanName}! Your account has been created successfully.`);
      } else {
        // 😅 Signup failed, show the error message
        Alert.alert('Signup Failed', result.error);
      }
    } catch (error) {
      // 😱 Something unexpected happened
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false); // ✅ Hide loading spinner
    }
  };

  // 🔄 Reset password - when user clicks "Forgot Password?"
  const handleResetPassword = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true); // ⏳ Show loading spinner

    try {
      // 📧 Send password reset email
      const result = await resetPassword(cleanEmail);
      
      if (result.success) {
        Alert.alert(
          'Check Your Email', 
          'We\'ve sent you an email with instructions to reset your password.'
        );
      } else {
        Alert.alert('Reset Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false); // ✅ Hide loading spinner
    }
  };

  // 📧 Check if email looks valid - like checking if a phone number has the right format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 🧹 Clear all the input fields - like erasing a whiteboard
  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setShowPassword(false);
  };

  // 🔄 Switch between login and signup modes
  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearForm(); // 🧹 Clear the form when switching modes
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 🎨 Header with app logo and title */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="notebook" size={80} color="#FF6B6B" />
          <Text style={styles.title}>OneClick Notes</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </Text>
        </View>

        {/* 📝 Input form - where users type their information */}
        <View style={styles.form}>
          {/* 👤 Name field (only for signup) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account" size={24} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          {/* 📧 Email field */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email" size={24} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* 🔐 Password field */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock" size={24} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <MaterialCommunityIcons 
                name={showPassword ? "eye-off" : "eye"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          {/* 🔐 Confirm password field (only for signup) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check" size={24} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* 🔑 Main action button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={isLogin ? handleLogin : handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Login' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          {/* 🔄 Forgot password link (only for login) */}
          {isLogin && (
            <TouchableOpacity onPress={handleResetPassword} style={styles.linkButton}>
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>
          )}

          {/* 🔄 Switch mode link */}
          <TouchableOpacity onPress={toggleMode} style={styles.linkButton}>
            <Text style={styles.linkText}>
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Login"
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// 🎨 Styling - making everything look pretty
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7efe7', // Warm, paper-like background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c2c2c',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2c2c2c',
  },
  eyeButton: {
    padding: 4,
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#FF6B6B',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default AuthScreen; 