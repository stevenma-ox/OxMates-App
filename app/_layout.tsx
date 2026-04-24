import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/constants';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setSession(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setProfileComplete(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('profile_complete')
      .eq('id', userId)
      .single();
    setProfileComplete(data?.profile_complete ?? false);
  }

  useEffect(() => {
    if (!fontsLoaded || session === undefined) return;

    if (!session) {
      router.replace('/');
      return;
    }
    if (profileComplete === null) return;
    if (!profileComplete) {
      router.replace('/onboarding');
      return;
    }
    router.replace('/(tabs)/discover');
  }, [fontsLoaded, session, profileComplete]);

  if (!fontsLoaded || session === undefined) {
    return <View style={{ flex: 1, backgroundColor: COLORS.NAVY }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
