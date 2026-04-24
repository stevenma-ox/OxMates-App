import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import {
  COLORS, OXFORD_COLLEGES, OXFORD_MAJORS, YEAR_OPTIONS,
  GENDER_OPTIONS, PREFERENCE_OPTIONS, INTEREST_TAGS,
} from '../lib/constants';

type OnboardingData = {
  full_name: string;
  college: string;
  major: string;
  year: string;
  bio: string;
  interests: string[];
  gender: string;
  gender_preference: string;
};

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    full_name: '', college: '', major: '', year: '',
    bio: '', interests: [], gender: '', gender_preference: '',
  });

  function toggleInterest(tag: string) {
    setData(prev => {
      const has = prev.interests.includes(tag);
      if (!has && prev.interests.length >= 8) return prev;
      return {
        ...prev,
        interests: has ? prev.interests.filter(i => i !== tag) : [...prev.interests, tag],
      };
    });
  }

  function validateStep(): boolean {
    if (step === 0 && !data.full_name.trim()) {
      Alert.alert('Required', 'Please enter your full name.'); return false;
    }
    if (step === 1 && !data.college) {
      Alert.alert('Required', 'Please select your college.'); return false;
    }
    if (step === 2 && (!data.major || !data.year)) {
      Alert.alert('Required', 'Please select your subject and year.'); return false;
    }
    if (step === 4 && (!data.gender || !data.gender_preference)) {
      Alert.alert('Required', 'Please complete gender & preference.'); return false;
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else handleSubmit();
  }

  async function handleSubmit() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...data,
      profile_complete: true,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)/discover');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Progress dots */}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What's your name?</Text>
              <Text style={styles.stepSubtitle}>As it appears on your university card</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.MUTED}
                value={data.full_name}
                onChangeText={v => setData(d => ({ ...d, full_name: v }))}
                autoFocus
              />
            </View>
          )}

          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Your College</Text>
              <Text style={styles.stepSubtitle}>Select your Oxford college</Text>
              <View style={styles.chipGrid}>
                {OXFORD_COLLEGES.map(college => (
                  <Pressable
                    key={college}
                    style={[styles.chip, data.college === college && styles.chipActive]}
                    onPress={() => setData(d => ({ ...d, college }))}
                  >
                    <Text style={[styles.chipText, data.college === college && styles.chipTextActive]}>
                      {college}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Subject & Year</Text>
              <Text style={styles.stepSubtitle}>What are you studying?</Text>
              <View style={styles.chipGrid}>
                {OXFORD_MAJORS.map(major => (
                  <Pressable
                    key={major}
                    style={[styles.chip, data.major === major && styles.chipActive]}
                    onPress={() => setData(d => ({ ...d, major }))}
                  >
                    <Text style={[styles.chipText, data.major === major && styles.chipTextActive]}>
                      {major}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.stepSubtitle, { marginTop: 24 }]}>Year of Study</Text>
              <View style={styles.segmentRow}>
                {YEAR_OPTIONS.map(year => (
                  <Pressable
                    key={year}
                    style={[styles.segment, data.year === year && styles.segmentActive]}
                    onPress={() => setData(d => ({ ...d, year }))}
                  >
                    <Text style={[styles.segmentText, data.year === year && styles.segmentTextActive]}>
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>About You</Text>
              <Text style={styles.stepSubtitle}>Bio (optional)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell others a little about yourself..."
                placeholderTextColor={COLORS.MUTED}
                value={data.bio}
                onChangeText={v => setData(d => ({ ...d, bio: v.slice(0, 200) }))}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{data.bio.length}/200</Text>
              <Text style={[styles.stepSubtitle, { marginTop: 20 }]}>
                Interests · {data.interests.length}/8
              </Text>
              <View style={styles.chipGrid}>
                {INTEREST_TAGS.map(tag => (
                  <Pressable
                    key={tag}
                    style={[styles.chip, data.interests.includes(tag) && styles.chipActive]}
                    onPress={() => toggleInterest(tag)}
                  >
                    <Text style={[styles.chipText, data.interests.includes(tag) && styles.chipTextActive]}>
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Identity & Preference</Text>
              <Text style={styles.stepSubtitle}>I identify as</Text>
              <View style={styles.radioGroup}>
                {GENDER_OPTIONS.map(g => (
                  <Pressable
                    key={g}
                    style={[styles.radioRow, data.gender === g && styles.radioRowActive]}
                    onPress={() => setData(d => ({ ...d, gender: g }))}
                  >
                    <View style={[styles.radioCircle, data.gender === g && styles.radioCircleActive]} />
                    <Text style={[styles.radioLabel, data.gender === g && styles.radioLabelActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.stepSubtitle, { marginTop: 24 }]}>I'm interested in</Text>
              <View style={styles.radioGroup}>
                {PREFERENCE_OPTIONS.map(p => (
                  <Pressable
                    key={p}
                    style={[styles.radioRow, data.gender_preference === p && styles.radioRowActive]}
                    onPress={() => setData(d => ({ ...d, gender_preference: p }))}
                  >
                    <View style={[styles.radioCircle, data.gender_preference === p && styles.radioCircleActive]} />
                    <Text style={[styles.radioLabel, data.gender_preference === p && styles.radioLabelActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navRow}>
          {step > 0 && (
            <Pressable style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.nextBtn, step === 0 && { marginLeft: 'auto' }]}
            onPress={next}
            disabled={loading}
          >
            <Text style={styles.nextBtnText}>
              {step === TOTAL_STEPS - 1 ? 'Complete Profile ✓' : 'Continue →'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.NAVY },
  flex: { flex: 1 },
  progressRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, paddingTop: 20, paddingBottom: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.BORDER,
  },
  dotActive: { backgroundColor: COLORS.GOLD },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  stepContainer: { paddingTop: 16, gap: 12 },
  stepTitle: {
    fontSize: 28, color: COLORS.GOLD,
    fontFamily: 'CormorantGaramond_700Bold', marginBottom: 4,
  },
  stepSubtitle: { fontSize: 13, color: COLORS.MUTED, letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.INPUT_BG, borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.TEXT_WARM,
  },
  bioInput: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.MUTED, textAlign: 'right' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  chipActive: { borderColor: COLORS.GOLD, backgroundColor: '#1A1500' },
  chipText: { fontSize: 13, color: COLORS.MUTED },
  chipTextActive: { color: COLORS.GOLD },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  segmentActive: { borderColor: COLORS.GOLD, backgroundColor: '#1A1500' },
  segmentText: { fontSize: 13, color: COLORS.MUTED },
  segmentTextActive: { color: COLORS.GOLD },
  radioGroup: { gap: 10 },
  radioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.BORDER, backgroundColor: COLORS.SURFACE,
  },
  radioRowActive: { borderColor: COLORS.GOLD, backgroundColor: '#1A1500' },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.BORDER,
  },
  radioCircleActive: { borderColor: COLORS.GOLD, backgroundColor: COLORS.GOLD },
  radioLabel: { fontSize: 15, color: COLORS.MUTED },
  radioLabelActive: { color: COLORS.TEXT_WARM },
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: COLORS.BORDER,
  },
  backBtn: { paddingVertical: 14, paddingHorizontal: 20 },
  backBtnText: { fontSize: 15, color: COLORS.MUTED },
  nextBtn: {
    flex: 1, backgroundColor: COLORS.GOLD,
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginLeft: 12,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.NAVY },
});
