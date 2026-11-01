import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface ActivityItem {
  time: string;
  action: string;
  user: string;
}

interface ActivityListProps {
  activities: ActivityItem[];
}

const ActivityList: React.FC<ActivityListProps> = ({ activities }) => (
  <View style={styles.activityList}>
    {activities.map((activity, index) => (
      <View key={index} style={styles.activityItem}>
        <View style={styles.activityDot} />
        <View style={styles.activityContent}>
          <Text style={styles.activityAction}>{activity.action}</Text>
          <Text style={styles.activityUser}>{activity.user}</Text>
        </View>
        <Text style={styles.activityTime}>{activity.time}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  activityList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    color: Colors.text,
  },
  activityUser: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
});

export default ActivityList;