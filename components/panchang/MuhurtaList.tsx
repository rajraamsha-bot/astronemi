import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface Timing {
  name: string;
  time: string;
  type: 'good' | 'bad';
}

interface MuhurtaListProps {
  timings: Timing[];
}

export const MuhurtaList = React.memo(({ timings }: MuhurtaListProps) => {
  return (
    <View style={styles.container}>
      {timings.map((timing, i) => (
        <View 
          key={i} 
          style={[
            styles.timingRow, 
            { backgroundColor: timing.type === 'good' ? '#E8F5E9' : '#FFEBEE' }
          ]}
        >
          <View style={styles.timingLeft}>
            <Text style={styles.timingIcon}>{timing.type === 'good' ? '✅' : '⚠️'}</Text>
            <View>
              <Text style={[
                styles.timingName, 
                { color: timing.type === 'good' ? Colors.success : Colors.error }
              ]}>
                {timing.name}
              </Text>
              <Text style={styles.timingType}>{timing.type === 'good' ? 'Auspicious' : 'Avoid'}</Text>
            </View>
          </View>
          <Text style={[
            styles.timingTime, 
            { color: timing.type === 'good' ? Colors.success : Colors.error }
          ]}>
            {timing.time}
          </Text>
        </View>
      ))}
    </View>
  );
});
MuhurtaList.displayName = 'MuhurtaList';

const styles = StyleSheet.create({
  container: { gap: 6 },
  timingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10 },
  timingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timingIcon: { fontSize: 18 },
  timingName: { fontSize: 14, fontWeight: '700' },
  timingType: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  timingTime: { fontSize: 13, fontWeight: '600' },
});
