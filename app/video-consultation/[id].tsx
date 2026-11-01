import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';

export default function VideoConsultationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (id) {
      router.replace(`/call/${id}?type=video`);
    }
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.darkBg, justifyContent: 'center', alignItems: 'center' }}>
      <Stack.Screen options={{ headerShown: false }} />
      {id ? (
        <>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={{ color: Colors.white, marginTop: 16 }}>Connecting video consultation…</Text>
        </>
      ) : (
        <Text style={{ color: Colors.white }}>Consultation not found</Text>
      )}
    </View>
  );
}
