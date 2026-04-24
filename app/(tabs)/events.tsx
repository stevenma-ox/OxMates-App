import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, OXFORD_COLLEGES } from '../../lib/constants';

type OxEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  college: string;
  attendees: string[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function EventsScreen() {
  const [events, setEvents] = useState<OxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [collegeFilter, setCollegeFilter] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    })();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [collegeFilter]);

  async function loadEvents() {
    setLoading(true);
    let query = supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });

    if (collegeFilter) query = query.eq('college', collegeFilter);

    const { data } = await query;
    setEvents(data as OxEvent[] || []);
    setLoading(false);
  }

  async function toggleRsvp(event: OxEvent) {
    if (!currentUserId) return;
    const attending = event.attendees?.includes(currentUserId);
    const updated = attending
      ? event.attendees.filter(id => id !== currentUserId)
      : [...(event.attendees || []), currentUserId];

    await supabase
      .from('events')
      .update({ attendees: updated })
      .eq('id', event.id);

    setEvents(prev =>
      prev.map(e => e.id === event.id ? { ...e, attendees: updated } : e)
    );
  }

  function renderEvent({ item }: { item: OxEvent }) {
    const { day, month, time } = formatDate(item.date);
    const attending = item.attendees?.includes(currentUserId);
    return (
      <View style={styles.eventCard}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventMeta}>🕐 {time} · 📍 {item.location}</Text>
          {item.college && (
            <View style={styles.collegeBadge}>
              <Text style={styles.collegeBadgeText}>{item.college}</Text>
            </View>
          )}
          {item.description ? (
            <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.rsvpRow}>
            <Text style={styles.attendeeCount}>
              {item.attendees?.length ?? 0} attending
            </Text>
            <Pressable
              style={[styles.rsvpBtn, attending && styles.rsvpBtnActive]}
              onPress={() => toggleRsvp(item)}
            >
              <Text style={[styles.rsvpBtnText, attending && styles.rsvpBtnTextActive]}>
                {attending ? '✓ Attending' : 'RSVP'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.titleSub}>Oxford Campus</Text>
      </View>

      {/* College filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          style={[styles.filterChip, !collegeFilter && styles.filterChipActive]}
          onPress={() => setCollegeFilter(null)}
        >
          <Text style={[styles.filterChipText, !collegeFilter && styles.filterChipTextActive]}>
            All
          </Text>
        </Pressable>
        {OXFORD_COLLEGES.map(college => (
          <Pressable
            key={college}
            style={[styles.filterChip, collegeFilter === college && styles.filterChipActive]}
            onPress={() => setCollegeFilter(college)}
          >
            <Text style={[styles.filterChipText, collegeFilter === college && styles.filterChipTextActive]}>
              {college}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.GOLD} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>◆</Text>
          <Text style={styles.emptyText}>No upcoming events</Text>
          <Text style={styles.emptyHint}>
            {collegeFilter ? `No events for ${collegeFilter}` : 'Check back soon'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => e.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.NAVY },
  titleRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 28, color: COLORS.GOLD, fontFamily: 'CormorantGaramond_700Bold' },
  titleSub: { fontSize: 13, color: COLORS.MUTED },
  filterRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  filterChipActive: { borderColor: COLORS.GOLD, backgroundColor: '#1A1500' },
  filterChipText: { fontSize: 12, color: COLORS.MUTED },
  filterChipTextActive: { color: COLORS.GOLD },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 40, color: COLORS.GOLD },
  emptyText: { fontSize: 18, color: COLORS.TEXT_WARM, fontFamily: 'CormorantGaramond_600SemiBold' },
  emptyHint: { fontSize: 13, color: COLORS.MUTED },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  eventCard: {
    flexDirection: 'row', paddingVertical: 16, gap: 14,
  },
  dateBadge: {
    width: 50, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2,
  },
  dateDay: { fontSize: 24, color: COLORS.GOLD, fontFamily: 'CormorantGaramond_700Bold', lineHeight: 26 },
  dateMonth: { fontSize: 11, color: COLORS.MUTED, letterSpacing: 1 },
  eventInfo: { flex: 1, gap: 6 },
  eventTitle: { fontSize: 16, color: COLORS.TEXT_WARM, fontWeight: '600' },
  eventMeta: { fontSize: 12, color: COLORS.MUTED },
  collegeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.SURFACE, borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  collegeBadgeText: { fontSize: 11, color: COLORS.MUTED },
  eventDesc: { fontSize: 13, color: COLORS.MUTED, lineHeight: 18 },
  rsvpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  attendeeCount: { fontSize: 12, color: COLORS.MUTED },
  rsvpBtn: {
    borderWidth: 1, borderColor: COLORS.GOLD,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5,
  },
  rsvpBtnActive: { backgroundColor: COLORS.GOLD },
  rsvpBtnText: { fontSize: 12, color: COLORS.GOLD, fontWeight: '600' },
  rsvpBtnTextActive: { color: COLORS.NAVY },
  separator: { height: 1, backgroundColor: COLORS.BORDER },
});
