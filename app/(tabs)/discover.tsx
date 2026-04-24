import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Image,
  Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';
import ProfileCard, { CardProfile } from '../../components/ProfileCard';

const { width: SCREEN_W } = Dimensions.get('window');

type MatchInfo = {
  matchId: string;
  profile: CardProfile;
};

export default function DiscoverScreen() {
  const [profiles, setProfiles] = useState<CardProfile[]>([]);
  const [topIndex, setTopIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const matchAnim1 = useRef(new Animated.Value(-SCREEN_W / 2)).current;
  const matchAnim2 = useRef(new Animated.Value(SCREEN_W / 2)).current;

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (matchInfo) {
      matchAnim1.setValue(-SCREEN_W / 2);
      matchAnim2.setValue(SCREEN_W / 2);
      Animated.parallel([
        Animated.spring(matchAnim1, { toValue: -40, useNativeDriver: true }),
        Animated.spring(matchAnim2, { toValue: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [matchInfo]);

  async function loadProfiles() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: swiped, error: swipedError } = await supabase
      .from('swipes')
      .select('target_id')
      .eq('user_id', user.id);
    // Bug 3 fix: if we can't determine what's been swiped, bail out rather than
    // reshowing already-swiped profiles. The empty state has a Refresh button.
    if (swipedError) {
      setLoading(false);
      return;
    }
    const excludeIds = [(swiped || []).map(s => s.target_id), user.id].flat();

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('gender_preference')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('profiles')
      .select('id, full_name, college, major, year, bio, interests, avatar_url')
      .eq('profile_complete', true)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(20);

    if (myProfile?.gender_preference === 'Men') query = query.eq('gender', 'Man');
    else if (myProfile?.gender_preference === 'Women') query = query.eq('gender', 'Woman');

    const { data } = await query;
    setProfiles(data as CardProfile[] || []);
    setTopIndex(0);
    setLoading(false);
  }

  const handleSwipe = useCallback(async (action: 'like' | 'pass') => {
    const target = profiles[topIndex];
    if (!target) return;

    // Advance card immediately for snappy UX
    setTopIndex(i => i + 1);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTopIndex(i => i - 1);
      return;
    }

    // 1. Record this swipe.
    // Ignore duplicate errors (23505) — the swipe was already recorded.
    // On any other error, log it but continue: the mutual-like check below
    // still needs to run so the match modal can appear if the other user
    // already liked us.  The profile may reappear on next load if the
    // swipe wasn't saved, but that is better than silently skipping the match.
    const { error: swipeError } = await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: target.id,
      action,
    });
    if (swipeError && swipeError.code !== '23505') {
      console.error('Failed to record swipe:', swipeError.message);
    }

    if (action !== 'like') return;

    // 2. Check if the other user has already liked us
    const { data: theirLike, error: theirLikeError } = await supabase
      .from('swipes')
      .select('id')
      .eq('user_id', target.id)
      .eq('target_id', user.id)
      .eq('action', 'like')
      .maybeSingle();

    if (theirLikeError) console.error('[match] theirLike query error:', theirLikeError.message, theirLikeError.code);
    if (!theirLike) return;

    // 3. Mutual like — create match record (upsert so duplicates are safe)
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${target.id}),` +
        `and(user1_id.eq.${target.id},user2_id.eq.${user.id})`
      )
      .maybeSingle();

    let matchId = existingMatch?.id;

    if (!matchId) {
      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({ user1_id: user.id, user2_id: target.id })
        .select('id')
        .single();

      if (matchError) {
        // Bug 1 fix: a race condition (both users liked simultaneously) may have
        // caused the other user's insert to win. Re-fetch before giving up.
        const { data: raceMatch } = await supabase
          .from('matches')
          .select('id')
          .or(
            `and(user1_id.eq.${user.id},user2_id.eq.${target.id}),` +
            `and(user1_id.eq.${target.id},user2_id.eq.${user.id})`
          )
          .maybeSingle();

        if (!raceMatch) {
          console.error('Failed to create match:', matchError.message);
          return;
        }
        matchId = raceMatch.id;
      } else {
        matchId = newMatch.id;
      }
    }

    // 4. Show match UI
    setMatchInfo({ matchId, profile: target });
  }, [profiles, topIndex]);

  const handleSwipeLeft = useCallback(() => handleSwipe('pass'), [handleSwipe]);
  const handleSwipeRight = useCallback(() => handleSwipe('like'), [handleSwipe]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  const remaining = profiles.slice(topIndex);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>Scholars</Text>
        <Text style={styles.logoSub}>⚜ Oxford</Text>
      </View>

      <View style={styles.cardArea}>
        {remaining.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚜</Text>
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptyText}>No more new profiles right now. Check back soon.</Text>
            <Pressable style={styles.refreshBtn} onPress={loadProfiles}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {remaining[1] && (
              <ProfileCard
                key={remaining[1].id + '_back'}
                profile={remaining[1]}
                onSwipeLeft={() => {}}
                onSwipeRight={() => {}}
                isTop={false}
              />
            )}
            <ProfileCard
              key={remaining[0].id}
              profile={remaining[0]}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              isTop
            />
          </>
        )}
      </View>

      {/* Action buttons */}
      {remaining.length > 0 && (
        <View style={styles.actionRow}>
          <Pressable style={styles.passBtn} onPress={handleSwipeLeft}>
            <Text style={styles.passBtnText}>✕</Text>
          </Pressable>
          <Pressable style={styles.likeBtn} onPress={handleSwipeRight}>
            <Text style={styles.likeBtnText}>♡</Text>
          </Pressable>
        </View>
      )}

      {/* Match modal */}
      <Modal visible={!!matchInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.matchCard}>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSubtitle}>You and {matchInfo?.profile.full_name} liked each other</Text>

            <View style={styles.avatarRow}>
              <Animated.View style={{ transform: [{ translateX: matchAnim1 }] }}>
                {matchInfo?.profile.avatar_url ? (
                  <Image source={{ uri: matchInfo.profile.avatar_url }} style={styles.matchAvatar} />
                ) : (
                  <View style={[styles.matchAvatar, styles.matchAvatarPlaceholder]}>
                    <Text style={styles.matchAvatarInitial}>{matchInfo?.profile.full_name?.[0]}</Text>
                  </View>
                )}
              </Animated.View>
              <Text style={styles.heartIcon}>♡</Text>
              <Animated.View style={{ transform: [{ translateX: matchAnim2 }] }}>
                <View style={[styles.matchAvatar, styles.matchAvatarPlaceholder]}>
                  <Text style={styles.matchAvatarInitial}>Me</Text>
                </View>
              </Animated.View>
            </View>

            <Pressable
              style={styles.chatBtn}
              onPress={() => {
                setMatchInfo(null);
                router.push(`/chat/${matchInfo?.matchId}`);
              }}
            >
              <Text style={styles.chatBtnText}>Start Chatting →</Text>
            </Pressable>
            <Pressable style={styles.laterBtn} onPress={() => setMatchInfo(null)}>
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.NAVY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'center', gap: 8,
    paddingTop: 12, paddingBottom: 8,
  },
  logo: {
    fontSize: 22, color: COLORS.GOLD,
    fontFamily: 'CormorantGaramond_700Bold', letterSpacing: 3,
  },
  logoSub: { fontSize: 12, color: COLORS.MUTED },
  cardArea: {
    flex: 1, marginHorizontal: 20, marginBottom: 12,
    position: 'relative',
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 48, color: COLORS.GOLD },
  emptyTitle: { fontSize: 22, color: COLORS.TEXT_WARM, fontFamily: 'CormorantGaramond_700Bold' },
  emptyText: { fontSize: 14, color: COLORS.MUTED, textAlign: 'center' },
  refreshBtn: {
    marginTop: 8, borderWidth: 1, borderColor: COLORS.GOLD,
    borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10,
  },
  refreshBtnText: { color: COLORS.GOLD, fontSize: 14 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 40, paddingVertical: 12,
  },
  passBtn: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: COLORS.OXFORD_RED,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(138,21,56,0.1)',
  },
  passBtnText: { fontSize: 24, color: COLORS.OXFORD_RED },
  likeBtn: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: COLORS.GOLD,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
  },
  likeBtnText: { fontSize: 24, color: COLORS.GOLD },
  // Match modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(6,10,17,0.92)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  matchCard: {
    backgroundColor: COLORS.SURFACE, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.GOLD,
    padding: 32, alignItems: 'center', gap: 16, width: '100%',
  },
  matchTitle: {
    fontSize: 32, color: COLORS.GOLD,
    fontFamily: 'CormorantGaramond_700Bold',
  },
  matchSubtitle: { fontSize: 14, color: COLORS.MUTED, textAlign: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginVertical: 8 },
  matchAvatar: { width: 80, height: 80, borderRadius: 40 },
  matchAvatarPlaceholder: {
    backgroundColor: '#1A2535', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.GOLD,
  },
  matchAvatarInitial: { fontSize: 28, color: COLORS.GOLD, fontFamily: 'CormorantGaramond_700Bold' },
  heartIcon: { fontSize: 28, color: COLORS.GOLD, zIndex: 1, marginHorizontal: -8 },
  chatBtn: {
    backgroundColor: COLORS.GOLD, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center',
  },
  chatBtnText: { color: COLORS.NAVY, fontSize: 16, fontWeight: '700' },
  laterBtn: { paddingVertical: 8 },
  laterBtnText: { color: COLORS.MUTED, fontSize: 14 },
});
