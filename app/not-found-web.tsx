import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WebNotSupported() {
  const { t } = useLanguage();
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('notFoundWeb.title')}</Text>
      <Text style={styles.subtitle}>
        {t('notFoundWeb.subtitle')}
      </Text>
      <Text style={styles.description}>
        {t('notFoundWeb.description')}
      </Text>
      <View style={styles.features}>
        <Text style={styles.feature}>{t('notFoundWeb.feature1')}</Text>
        <Text style={styles.feature}>{t('notFoundWeb.feature2')}</Text>
        <Text style={styles.feature}>{t('notFoundWeb.feature3')}</Text>
        <Text style={styles.feature}>{t('notFoundWeb.feature4')}</Text>
        <Text style={styles.feature}>{t('notFoundWeb.feature5')}</Text>
      </View>
      <Text style={styles.instructions}>
        {t('notFoundWeb.instructions')}
      </Text>
      <Text style={styles.step}>{t('notFoundWeb.step1')}</Text>
      <Text style={styles.step}>{t('notFoundWeb.step2')}</Text>
      <Text style={styles.step}>{t('notFoundWeb.step3')}</Text>
      
      <View style={styles.links}>
        <Text style={styles.linkText}>{t('notFoundWeb.downloadExpo')}</Text>
        <Text style={styles.link}>{t('notFoundWeb.iosAppStore')}</Text>
        <Text style={styles.link}>{t('notFoundWeb.androidPlayStore')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#444',
    marginBottom: 16,
    textAlign: 'center',
    maxWidth: 600,
  },
  features: {
    marginBottom: 24,
    alignSelf: 'stretch',
    maxWidth: 600,
  },
  feature: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    paddingLeft: 20,
  },
  instructions: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  step: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  links: {
    marginTop: 32,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
});
