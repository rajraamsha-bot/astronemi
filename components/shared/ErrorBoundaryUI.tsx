import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertCircle, Home, RefreshCcw } from 'lucide-react-native';

interface ErrorBoundaryUIProps {
  error: Error;
  reset: () => void;
}

const IS_DEV = __DEV__;

export const ErrorBoundaryUI = ({ error, reset }: ErrorBoundaryUIProps) => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AlertCircle color="#E53E3E" size={64} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>We encountered an unexpected error while preparing your astrological insights.</Text>
      </View>

      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Error Details:</Text>
        <ScrollView style={styles.errorScroll}>
          <Text style={styles.errorText}>{error.message}</Text>
          {IS_DEV && error.stack && (
            <Text style={styles.stackText}>{error.stack}</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={reset}>
          <RefreshCcw size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>Retry Action</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/')}>
          <Home size={20} color="#6B46C1" />
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.supportText}>If this persists, contact support</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF', padding: 24 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  errorCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FED7D7', marginBottom: 32 },
  errorTitle: { fontSize: 13, fontWeight: '700', color: '#E53E3E', marginBottom: 8, textTransform: 'uppercase' },
  errorScroll: { flex: 1 },
  errorText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  stackText: { fontSize: 12, color: '#999', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  footer: { gap: 16 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B46C1', paddingVertical: 16, borderRadius: 12, gap: 10 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: '#6B46C1' },
  secondaryBtnText: { color: '#6B46C1', fontSize: 16, fontWeight: '700' },
  supportText: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 24 },
});
