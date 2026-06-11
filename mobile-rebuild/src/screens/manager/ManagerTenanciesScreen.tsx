import type { StackScreenProps } from '@react-navigation/stack';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ManagerEmptyState } from '../../components/manager/ManagerEmptyState';
import { ManagerTenancyCard } from '../../components/manager/ManagerTenancyCard';
import { ManagerScreenHeader } from '../../components/manager/ManagerScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useManagerPreview } from '../../context/ManagerPreviewContext';
import { useManagerTenancies } from '../../hooks/manager/useManagerTenancies';
import { colors, spacing } from '../../theme';
import type { ManagerTenanciesStackParamList } from '../../types/navigation.types';
import { getManagerBottomContentPadding } from '../../utils/manager-layout';

export function ManagerTenanciesScreen({
  navigation,
}: StackScreenProps<ManagerTenanciesStackParamList, 'ManagerTenanciesList'>) {
  const { user } = useAuth();
  const preview = useManagerPreview();
  const insets = useSafeAreaInsets();
  const tenanciesQuery = useManagerTenancies(user?.id);

  if (!user && preview.enabled) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
        ]}
        style={styles.screen}
      >
        <ManagerScreenHeader
          icon="key-outline"
          subtitle="View renters, property links, rent amount, period, and status."
          title="Tenancies"
        />
        <ManagerEmptyState
          description="Lease and tenancy records will appear here for signed-in house managers."
          icon="key-outline"
          title="Tenancies preview"
        />
      </ScrollView>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <ManagerEmptyState
          description="Sign in as a house manager to view property tenancies."
          icon="key-outline"
          title="Tenancies unavailable"
        />
      </View>
    );
  }

  if (tenanciesQuery.isLoading) {
    return <LoadingState message="Loading tenancies" />;
  }

  if (tenanciesQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          description={
            tenanciesQuery.error instanceof Error
              ? tenanciesQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => {
            void tenanciesQuery.refetch();
          }}
          title="Could not load tenancies"
        />
      </View>
    );
  }

  const tenancies = tenanciesQuery.data ?? [];

  return (
    <FlatList
      ListEmptyComponent={
        <ManagerEmptyState
          description="Active and past tenancies linked to your properties will appear here."
          icon="key-outline"
          title="No tenancies yet"
        />
      }
      ListHeaderComponent={
        <ManagerScreenHeader
          icon="key-outline"
          subtitle="View renters, property links, rent amount, period, and status."
          title="Tenancies"
        />
      }
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
      ]}
      data={tenancies}
      keyExtractor={(tenancy) => tenancy.id}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void tenanciesQuery.refetch();
          }}
          refreshing={tenanciesQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
      renderItem={({ item }) => (
        <ManagerTenancyCard
          onPress={() => {
            navigation.navigate('ManagerTenancyDetail', {
              tenancyId: item.id,
            });
          }}
          tenancy={item}
        />
      )}
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
