import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  COLORS, OXFORD_COLLEGES, OXFORD_MAJORS,
  YEAR_OPTIONS, GENDER_OPTIONS, PREFERENCE_OPTIONS, INTEREST_TAGS,
} from '../../lib/constants';

type Profile = {
  id: string;
  full_name: string;
  college: string;
  major: string;
  year: string;
  bio: string;
  interests: string[];
  gender: string;
  gender_preference: string;
  avatar_url: string | null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(data as Profile);
    setDraft(data as Profile);
    setLoading(false);
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to your photo library to upload a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const fileName = `${user.id}_${Date.now()}.${ext}`;

    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: `image/${ext}` } as any);

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, formData, { upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
      setDraft(prev => ({ ...prev, avatar_url: publicUrl }));
    } else {
      Alert.alert('Upload failed', error.message);
    }
    setUploading(false);
  }

  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from('profiles').update({
      full_name: draft.full_name,
      bio: draft.bio,
      college: draft.college,
      major: draft.major,
      year: draft.year,
      interests: draft.interests,
      gender: draft.gender,
      gender_preference: draft.gender_preference,
    }).eq('id', user.id);

    setSaving(false);
    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      setProfile({ ...profile!, ...draft } as Profile);
      setEditing(false);
    }
  }

  function toggleInterest(tag: string) {
    setDraft(prev => {
      const list = prev.interests ?? [];
      const has = list.includes(tag);
      if (!has && list.length >= 8) return prev;
      return { ...prev, interests: has ? list.filter(t => t !== tag) : [...list, tag] };
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{editing ? 'Edit Profile' : 'My Profile'}</Text>
        {!editing ? (
          <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.editBtn} onPress={() => { setEditing(false); setDraft(profile!); }}>
            <Text style={styles.editBtnText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickPhoto} disabled={uploading}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{profile?.full_name?.[0] ?? '?'}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.NAVY} />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </View>
          </Pressable>
        </View>

        {!editing ? (
          /* ── View mode ── */
          <View style={styles.section}>
            <Text style={styles.profileName}>{profile?.full_name}</Text>
            <View style={styles.pillRow}>
              {profile?.college && <View style={styles.pill}><Text style={styles.pillText}>{profile.college}</Text></View>}
              {profile?.major && <View style={styles.pill}><Text style={styles.pillText}>{profile.major}</Text></View>}
              {profile?.year && <View style={styles.pill}><Text style={styles.pillText}>{profile.year}</Text></View>}
            </View>
            {profile?.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}
            {profile?.interests && profile.interests.length > 0 && (
              <View style={styles.tagGrid}>
                {profile.interests.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* ── Edit mode ── */
          <View style={styles.section}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={draft.full_name ?? ''}
              onChangeText={v => setDraft(d => ({ ...d, full_name: v }))}
              placeholderTextColor={COLORS.MUTED}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={draft.bio ?? ''}
              onChangeText={v => setDraft(d => ({ ...d, bio: v.slice(0, 200) }))}
              multiline maxLength={200}
              placeholderTextColor={COLORS.MUTED}
            />
            <Text style={styles.charCount}>{(draft.bio ?? '').length}/200</Text>

            <Text style={styles.label}>College</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={styles.chipRow}>
                {OXFORD_COLLEGES.map(c => (
                  <Pressable key={c} style={[styles.chip, draft.college === c && styles.chipActive]}
                    onPress={() => setDraft(d => ({ ...d, college: c }))}>
                    <Text style={[styles.chipText, draft.college === c && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={styles.chipRow}>
                {OXFORD_MAJORS.map(m => (
                  <Pressable key={m} style={[styles.chip, draft.major === m && styles.chipActive]}
                    onPress={() => setDraft(d => ({ ...d, major: m }))}>
                    <Text style={[styles.chipText, draft.major === m && styles.chipTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Year</Text>
            <View style={styles.chipRow}>
              {YEAR_OPTIONS.map(y => (
                <Pressable key={y} style={[styles.chip, draft.year === y && styles.chipActive]}
                  onPress={() => setDraft(d => ({ ...d, year: y }))}>
                  <Text style={[styles.chipText, draft.year === y && styles.chipTextActive]}>{y}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Interests ({(draft.interests ?? []).length}/8)</Text>
            <View style={styles.chipWrap}>
              {INTEREST_TAGS.map(tag => (
                <Pressable key={tag}
                  style={[styles.chip, (draft.interests ?? []).includes(tag) && styles.chipActive]}
                  onPress={() => toggleInterest(tag)}>
                  <Text style={[styles.chipText, (draft.interests ?? []).includes(tag) && styles.chipTextActive]}>{tag}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDER_OPTIONS.map(g => (
                <Pressable key={g} style={[styles.chip, draft.gender === g && styles.chipActive]}
                  onPress={() => setDraft(d => ({ ...d, gender: g }))}>
                  <Text style={[styles.chipText, draft.gender === g && styles.chipTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Interested In</Text>
            <View style={styles.chipRow}>
              {PREFERENCE_OPTIONS.map(p => (
                <Pressable key={p} style={[styles.chip, draft.gender_preference === p && styles.chipActive]}
                  onPress={() => setDraft(d => ({ ...d, gender_preference: p }))}>
                  <Text style={[styles.chipText, draft.gender_preference === p && styles.chipTextActive]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={COLORS.NAVY} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.NAVY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { fontSize: 28, color: COLORS.GOLD, fontFamily: 'CormorantGaramond_700Bold' },
  editBtn: {
    borderWidth: 1, borderColor: COLORS.GOLD,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6,
  },
  editBtnText: { fontSize: 14, color: COLORS.GOLD },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 120, height: 160, borderRadius: 16 },
  avatarPlaceholder: {
    backgroundColor: '#1A2535', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.BORDER,
  },
  avatarInitial: { fontSize: 48, color: COLORS.GOLD, fontFamily: 'CormorantGaramond_700Bold' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.GOLD, alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: { fontSize: 16 },
  section: { gap: 12 },
  profileName: {
    fontSize: 26, color: COLORS.TEXT_WARM,
    fontFamily: 'CormorantGaramond_700Bold', textAlign: 'center',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pill: {
    backgroundColor: COLORS.SURFACE, borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4,
  },
  pillText: { fontSize: 12, color: COLORS.MUTED },
  bio: { fontSize: 14, color: COLORS.TEXT_WARM, lineHeight: 20, textAlign: 'center' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: {
    backgroundColor: COLORS.SURFACE, borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: COLORS.MUTED },
  // Edit mode
  label: {
    fontSize: 12, fontWeight: '600', color: COLORS.GOLD,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.INPUT_BG, borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.TEXT_WARM,
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.MUTED, textAlign: 'right' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.BORDER, backgroundColor: COLORS.SURFACE,
  },
  chipActive: { borderColor: COLORS.GOLD, backgroundColor: '#1A1500' },
  chipText: { fontSize: 13, color: COLORS.MUTED },
  chipTextActive: { color: COLORS.GOLD },
  saveBtn: {
    backgroundColor: COLORS.GOLD, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.NAVY },
  logoutBtn: {
    marginTop: 32, borderWidth: 1, borderColor: COLORS.OXFORD_RED,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { fontSize: 15, color: COLORS.OXFORD_RED },
});
