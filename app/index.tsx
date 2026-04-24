import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { COLORS, OXFORD_DOMAINS } from '../lib/constants';

function isOxfordEmail(email: string): boolean {
  return OXFORD_DOMAINS.some((domain) => email.toLowerCase().endsWith(domain));
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  async function handleLogin() {
    if (!isOxfordEmail(email)) {
      Alert.alert('Access Restricted', 'Only Oxford University email addresses are permitted.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
  }

  async function handleRegister() {
    if (!isOxfordEmail(email)) {
      Alert.alert('Access Restricted', 'Only Oxford University email addresses are permitted.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Registration Failed', error.message);
    } else {
      Alert.alert(
        'Check Your Email',
        'We sent a confirmation link to your Oxford inbox. Please verify before logging in.',
      );
      setMode('login');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.crest}>⚜</Text>
            <Text style={styles.title}>Scholars</Text>
            <Text style={styles.subtitle}>Oxford University · Private Members</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'login' ? 'Welcome Back' : 'Request Access'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'login'
                ? 'Sign in with your Oxford email'
                : 'Register with your Oxford email address'}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@ox.ac.uk"
                placeholderTextColor={COLORS.MUTED}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={mode === 'login' ? handleLogin : handleRegister}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.NAVY} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              <Text style={styles.secondaryBtnText}>
                {mode === 'login' ? 'New to Scholars? Request Access' : 'Already a member? Sign In'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Exclusive to Oxford University · {OXFORD_DOMAINS.join(' · ')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.NAVY },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 32 },
  header: { alignItems: 'center', gap: 8 },
  crest: { fontSize: 40, color: COLORS.GOLD },
  title: {
    fontSize: 36, fontWeight: '700', color: COLORS.GOLD,
    letterSpacing: 4, textTransform: 'uppercase',
    fontFamily: 'CormorantGaramond_700Bold',
  },
  subtitle: { fontSize: 12, color: COLORS.MUTED, letterSpacing: 2, textTransform: 'uppercase' },
  card: {
    backgroundColor: COLORS.SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.BORDER, padding: 24, gap: 16,
  },
  cardTitle: {
    fontSize: 22, fontWeight: '600', color: COLORS.TEXT_WARM, textAlign: 'center',
    fontFamily: 'CormorantGaramond_600SemiBold',
  },
  cardSubtitle: { fontSize: 13, color: COLORS.MUTED, textAlign: 'center', marginBottom: 4 },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 12, fontWeight: '600', color: COLORS.GOLD,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.INPUT_BG, borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.TEXT_WARM,
  },
  primaryBtn: {
    backgroundColor: COLORS.GOLD, borderRadius: 10,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.NAVY, letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.BORDER },
  dividerText: { fontSize: 12, color: COLORS.MUTED },
  secondaryBtn: {
    borderWidth: 1, borderColor: COLORS.OXFORD_RED,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtnPressed: { backgroundColor: '#1A0A10' },
  secondaryBtnText: { fontSize: 14, color: COLORS.OXFORD_RED, fontWeight: '500' },
  footer: { fontSize: 11, color: '#3A4A5A', textAlign: 'center', letterSpacing: 0.5 },
});
