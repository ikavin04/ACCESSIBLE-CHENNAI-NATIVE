import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreferences } from '../context/PreferencesContext';
import { API_BASE, apiFetch } from '../config';

export default function LoginScreen({ navigation }) {
  const { theme } = usePreferences();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    (async () => {
      const userData = await AsyncStorage.getItem('ac_user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.user_id) {
          const prefs = await AsyncStorage.getItem('ac_prefs');
          const hasPrefs = prefs && Object.keys(JSON.parse(prefs)).length > 0;
          if (hasPrefs) {
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'ModeSelection' }] });
          }
        }
      }
    })();
  }, []);

  const handleSubmit = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    // Validate password confirmation for registration
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const prefs = JSON.parse((await AsyncStorage.getItem('ac_prefs')) || '{}');

    try {
      const endpoint = isRegister ? 'register' : 'login';
      const res = await apiFetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, preferences: prefs }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        setError('Server returned an invalid response. Please ensure the backend is running properly.');
        setIsLoading(false);
        return;
      }

      if (res.ok) {
        await AsyncStorage.setItem(
          'ac_user',
          JSON.stringify({ email, user_id: data.user_id })
        );

        const existingPrefs = await AsyncStorage.getItem('ac_prefs');
        const hasPrefs =
          existingPrefs && Object.keys(JSON.parse(existingPrefs)).length > 0;

        if ((isRegister && data.is_new_user) || !hasPrefs) {
          navigation.reset({ index: 0, routes: [{ name: 'ModeSelection' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
      } else {
        setError(data.error || 'Login/Register failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        'Cannot connect to server. Please make sure the backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth – open system browser
  const handleGoogle = () => {
    setError('');
    Linking.openURL(`${API_BASE}/api/google-auth/login`).catch(() => {
      setError('Unable to open Google sign-in. Please try again.');
    });
  };

  const passwordMismatch =
    isRegister &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.bgPrimary },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetters}>AC</Text>
          </View>
          <Text style={[styles.heading, { color: theme.textPrimary }]}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>
            {isRegister
              ? 'Join our accessible community'
              : 'Sign in to continue your journey'}
          </Text>
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.borderColor,
              ...theme.shadow,
            },
          ]}
        >
          {/* Email */}
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Email Address
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.borderColor,
                color: theme.textPrimary,
              },
            ]}
            placeholder="Enter your email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password */}
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.borderColor,
                color: theme.textPrimary,
              },
            ]}
            placeholder="Enter your password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Confirm Password (register) */}
          {isRegister && (
            <>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                Confirm Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: passwordMismatch ? '#d32f2f' : theme.borderColor,
                    color: theme.textPrimary,
                  },
                ]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              {passwordMismatch && (
                <Text style={styles.mismatchText}>Passwords do not match</Text>
              )}
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isRegister ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* OR divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.borderColor }]} />
            <Text style={[styles.dividerText, { color: theme.textSecondary, backgroundColor: theme.cardBg }]}>
              OR
            </Text>
          </View>

          {/* Google OAuth */}
          <TouchableOpacity
            style={[
              styles.googleBtn,
              { borderColor: theme.borderColor, backgroundColor: theme.cardBg },
            ]}
            onPress={handleGoogle}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={[styles.googleBtnText, { color: theme.textPrimary }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Toggle Register / Login */}
          <TouchableOpacity
            style={styles.toggleWrap}
            onPress={() => {
              setIsRegister(!isRegister);
              setConfirmPassword('');
              setError('');
            }}
          >
            <Text style={[styles.toggleText, { color: theme.accentColor }]}>
              {isRegister
                ? 'Already have an account? Sign In'
                : 'Need an account? Create One'}
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoLetters: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  subheading: { fontSize: 14 },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  mismatchText: { color: '#d32f2f', fontSize: 12, marginTop: -16, marginBottom: 16 },
  submitBtn: {
    width: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    marginVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dividerLine: { position: 'absolute', height: 1, left: 0, right: 0 },
  dividerText: { paddingHorizontal: 16, fontSize: 12, zIndex: 1 },
  googleBtn: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleBtnText: { fontSize: 16, fontWeight: '500' },
  toggleWrap: { marginTop: 20, alignItems: 'center', padding: 8 },
  toggleText: { fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  errorBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: { color: '#d32f2f', fontSize: 14, textAlign: 'center' },
});
