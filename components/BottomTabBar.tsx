import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS } from '../lib/constants';

const TABS = [
  { name: 'discover', label: 'Discover', icon: '⚜' },
  { name: 'matches',  label: 'Matches',  icon: '♡' },
  { name: 'events',  label: 'Events',   icon: '◆' },
  { name: 'profile', label: 'Profile',  icon: '◉' },
];

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Text style={[styles.icon, focused && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 18,
    color: COLORS.MUTED,
  },
  iconActive: {
    color: COLORS.GOLD,
  },
  label: {
    fontSize: 10,
    color: COLORS.MUTED,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: COLORS.GOLD,
  },
});
