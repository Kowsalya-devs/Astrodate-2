import { COUNTRIES, CountryCodePicker, type Country } from '@/components/country-code-picker';
import { useAuthAlert } from '@/lib/auth-alert-context';
import { supabase } from '@/lib/supabase';
import { isValidPhoneNumber } from '@/utils/phone-utils';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const router = useRouter();
  const navigation: any = useNavigation();
  const { showAlert } = useAuthAlert();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isMountedRef = useRef(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardSlideAnim = useRef(new Animated.Value(80)).current;
  const inputBorderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.spring(cardSlideAnim, { toValue: 0, friction: 8, tension: 40, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(inputBorderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleOAuthSuccess = async (user: any, isSignup: boolean) => {
    const userCreatedAt = new Date(user.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);
    if (isSignup && minutesSinceCreation > 2) {
      if (isMountedRef.current) setLoading(false);
      await supabase.auth.signOut();
      if (!isMountedRef.current) return;
      showAlert(
        'Account Already Exists',
        'An account with this Google email already exists. Please use the login page instead.',
        [{ text: 'Go to Login', onPress: () => { router.replace('/onboarding/login'); } }]
      );
      return;
    }
    if (isMountedRef.current) setLoading(false);
    router.replace('/onboarding/basic-details');
  };

  const handleGenerateOTP = async () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      showAlert('Phone number required', 'Please enter your phone number');
      return;
    }
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanedNumber || cleanedNumber.length < 7) {
      showAlert('Invalid phone number', 'Please enter a valid phone number');
      return;
    }
    const formatted = `${selectedCountry.dialCode}${cleanedNumber}`;
    if (!isValidPhoneNumber(formatted)) {
      showAlert('Invalid phone number', 'Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const { data: authUserData, error: authUserError } = await supabase.rpc('check_auth_user_exists', {
        input_phone: formatted,
      });
      if (authUserData && authUserData.length > 0) {
        if (isMountedRef.current) setLoading(false);
        showAlert(
          'Account Already Exists',
          'An account with this phone number already exists. Please use the login page instead.',
          [
            { text: 'Go to Login', onPress: () => { router.replace('/onboarding/login'); } },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
      const { data, error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) {
        let errorMessage = error.message || 'Could not send OTP. Please try again.';
        if (error.message?.includes('Invalid phone number')) {
          errorMessage = 'Invalid phone number format. Please include country code.';
        } else if (error.message?.includes('Twilio') || error.message?.includes('SMS')) {
          errorMessage = 'SMS service error. Please check your configuration.';
        }
        showAlert('OTP Generation Failed', errorMessage);
        if (isMountedRef.current) setLoading(false);
        return;
      }
      if (!data) {
        showAlert('OTP Generation Failed', 'No response from server.');
        if (isMountedRef.current) setLoading(false);
        return;
      }
      router.push({ pathname: '/onboarding/otp-verify', params: { phone: formatted, isSignup: 'true' } });
    } catch (err: any) {
      showAlert('OTP generation error', err?.message ?? String(err) ?? 'An unexpected error occurred.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const borderColor = inputBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.1)', '#8B5CF6'],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={['#0D0618', '#1A0B2E', '#2D1255', '#3D1A6E']}
          style={styles.background}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        >
          {/* Star field */}
          <View style={styles.starField} pointerEvents="none">
            {[...Array(28)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  {
                    top: `${(i * 37 + 5) % 95}%`,
                    left: `${(i * 53 + 8) % 93}%`,
                    width: i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
                    height: i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
                    opacity: 0.15 + (i % 5) * 0.12,
                  },
                ]}
              />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero section — hidden when keyboard is open */}
            {!isKeyboardVisible && (
              <Animated.View
                style={[
                  styles.heroSection,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <View style={styles.logoGlow} />
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.heroLogo}
                  resizeMode="contain"
                />
                <Text style={styles.heroTitle}>Create Account</Text>
                <Text style={styles.heroSubtitle}>Love is written in the stars ✦</Text>
              </Animated.View>
            )}

            {/* Card */}
            <Animated.View
              style={[
                styles.card,
                { transform: [{ translateY: cardSlideAnim }], opacity: fadeAnim },
              ]}
            >
              <LinearGradient
                colors={['#7C3AED', '#A855F7', '#EC4899']}
                style={styles.cardAccentLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Sign Up</Text>
                <Text style={styles.cardSubtitle}>Enter your phone number to get started</Text>

                {/* Phone input */}
                <Animated.View style={[styles.inputContainer, { borderColor }]}>
                  <CountryCodePicker
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                  />
                  <View style={styles.inputDivider} />
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(text) => {
                      const digitsOnly = text.replace(/\D/g, '');
                      if (digitsOnly.length <= 10) setPhoneNumber(digitsOnly);
                    }}
                    placeholder="Phone number"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={styles.input}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={10}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                  {phoneNumber.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setPhoneNumber('')}
                      style={styles.clearButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  )}
                </Animated.View>

                {/* Digit counter — only shown while typing */}
                {phoneNumber.length > 0 && (
                  <Text style={styles.digitCount}>{phoneNumber.length}/10</Text>
                )}

                {/* OTP Button */}
                <TouchableOpacity
                  onPress={handleGenerateOTP}
                  activeOpacity={0.85}
                  disabled={loading}
                  style={[styles.otpButtonWrapper, phoneNumber.length === 0 && styles.otpButtonDisabled]}
                >
                  <LinearGradient
                    colors={loading ? ['#3D2A6E', '#3D2A6E'] : ['#6D28D9', '#7C3AED', '#9333EA']}
                    style={styles.otpButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="person-add" size={17} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.otpButtonText}>Get OTP</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Terms note */}
                <Text style={styles.termsText}>
                  By signing up you agree to our{' '}
                  <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>
                    Privacy Policy
                  </Text>
                </Text>

                {/* Login link */}
                <View style={styles.loginRow}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/onboarding/login')}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text style={styles.loginLink}> Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D0618' },
  keyboardView: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },

  // Star field
  starField: { ...StyleSheet.absoluteFillObject },
  star: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },

  // Hero
  heroSection: {
    paddingTop: 70,
    paddingBottom: 36,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#7C3AED',
    opacity: 0.15,
    top: 78,
    alignSelf: 'center',
  },
  heroLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F3EEFF',
    letterSpacing: 0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#9B7DC8',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Card — dark glass style
  card: {
    width: '100%',
    backgroundColor: '#130826',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    shadowColor: '#4B0082',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 28,
    elevation: 20,
  },
  cardAccentLine: {
    height: 3,
    width: '100%',
    opacity: 0.9,
  },
  cardContent: {
    paddingTop: 30,
    paddingBottom: 44,
    paddingHorizontal: 28,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#EDE8FF',
    marginBottom: 5,
    letterSpacing: 0.1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B5A8A',
    marginBottom: 26,
    letterSpacing: 0.2,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 6,
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    color: '#EDE8FF',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 15,
    letterSpacing: 0.8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  digitCount: {
    fontSize: 11,
    color: '#6B5A8A',
    marginBottom: 20,
    marginLeft: 2,
    letterSpacing: 0.5,
  },

  // OTP Button
  otpButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 8,
  },
  otpButtonDisabled: {
    opacity: 0.5,
  },
  otpButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  otpButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // Terms
  termsText: {
    fontSize: 12,
    color: '#4A3A6A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  termsLink: {
    color: '#9B72CF',
    fontWeight: '600',
  },

  // Login
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#4A3A6A',
    fontSize: 13,
  },
  loginLink: {
    color: '#9B72CF',
    fontWeight: '600',
    fontSize: 13,
  },
});
