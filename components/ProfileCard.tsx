import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../lib/constants';

export type CardProfile = {
  id: string;
  full_name: string;
  college: string;
  major: string;
  year: string;
  bio: string;
  interests: string[];
  avatar_url: string | null;
};

type Props = {
  profile: CardProfile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_H * 0.72;
const SWIPE_THRESHOLD = 120;

export default function ProfileCard({ profile, onSwipeLeft, onSwipeRight, isTop }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_W * 1.5);
        runOnJS(onSwipeRight)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_W * 1.5);
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${(translateX.value / 300) * 15}deg` },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translateX.value / SWIPE_THRESHOLD)),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translateX.value / SWIPE_THRESHOLD)),
  }));

  const cardContent = (
    <View style={styles.card}>
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{profile.full_name?.[0] ?? '?'}</Text>
        </View>
      )}

      {/* LIKE / PASS badges */}
      <Animated.View style={[styles.badge, styles.likeBadge, likeOpacity]}>
        <Text style={styles.likeBadgeText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.badge, styles.passBadge, passOpacity]}>
        <Text style={styles.passBadgeText}>PASS</Text>
      </Animated.View>

      {/* Info overlay */}
      <View style={styles.overlay}>
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.meta}>{profile.college} · {profile.major}</Text>
        <View style={styles.yearBadge}>
          <Text style={styles.yearBadgeText}>{profile.year}</Text>
        </View>
        {profile.bio ? (
          <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
        ) : null}
        {profile.interests?.length > 0 && (
          <View style={styles.tagRow}>
            {profile.interests.slice(0, 4).map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  if (!isTop) {
    return (
      <View style={[styles.cardWrapper, styles.backCard]}>
        {cardContent}
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.cardWrapper, cardStyle]}>
        {cardContent}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'absolute',
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backCard: {
    transform: [{ scale: 0.96 }, { translateY: 12 }],
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  image: {
    width: '100%',
    height: '65%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '65%',
    backgroundColor: '#1A2535',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 80,
    color: COLORS.GOLD,
    fontFamily: 'CormorantGaramond_700Bold',
  },
  badge: {
    position: 'absolute',
    top: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeBadge: {
    left: 16,
    borderColor: COLORS.GOLD,
    transform: [{ rotate: '-15deg' }],
  },
  likeBadgeText: { fontSize: 22, fontWeight: '800', color: COLORS.GOLD },
  passBadge: {
    right: 16,
    borderColor: COLORS.OXFORD_RED,
    transform: [{ rotate: '15deg' }],
  },
  passBadgeText: { fontSize: 22, fontWeight: '800', color: COLORS.OXFORD_RED },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,10,17,0.88)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
  },
  name: {
    fontSize: 24,
    color: COLORS.TEXT_WARM,
    fontFamily: 'CormorantGaramond_700Bold',
  },
  meta: { fontSize: 13, color: COLORS.MUTED },
  yearBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1500',
    borderWidth: 1,
    borderColor: COLORS.GOLD,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  yearBadgeText: { fontSize: 11, color: COLORS.GOLD },
  bio: { fontSize: 13, color: COLORS.TEXT_WARM, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: COLORS.MUTED },
});
