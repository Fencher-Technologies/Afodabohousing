import type { StackScreenProps } from '@react-navigation/stack';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ManagerPropertyDetailCard } from '../../components/manager/ManagerPropertyDetailCard';
import { useAuth } from '../../context/AuthContext';
import { useManagerProperty } from '../../hooks/manager/useManagerProperties';
import { colors, spacing, typography } from '../../theme';
import type { ManagerPropertiesStackParamList } from '../../types/navigation.types';
import { formatStatusLabel } from '../../utils/format';

export function ManagerPropertyDetailScreen({
  route,
}: StackScreenProps<ManagerPropertiesStackParamList, 'ManagerPropertyDetail'>) {
  const { user } = useAuth();
  const propertyQuery = useManagerProperty(user?.id, route.params.propertyId);

  if (!user) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="Sign in as a house manager to view this property."
          title="Property unavailable"
        />
      </View>
    );
  }

  if (propertyQuery.isLoading) {
    return <LoadingState message="Loading property" />;
  }

  if (propertyQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          description={
            propertyQuery.error instanceof Error ? propertyQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void propertyQuery.refetch();
          }}
          title="Could not load property"
        />
      </View>
    );
  }

  const property = propertyQuery.data;

  if (!property) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="This property was not found for your manager account."
          title="Property not found"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void propertyQuery.refetch();
          }}
          refreshing={propertyQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Property Preview</Text>
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.subtitle}>
          {formatStatusLabel(property.status)} listing in {property.district}.
        </Text>
      </View>

      <ManagerPropertyDetailCard property={property} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing.xs,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 34,
  },
});
