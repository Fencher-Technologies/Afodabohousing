import type { StackScreenProps } from '@react-navigation/stack';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ManagerEmptyState } from '../../components/manager/ManagerEmptyState';
import { ManagerPropertyCard } from '../../components/manager/ManagerPropertyCard';
import { ManagerScreenHeader } from '../../components/manager/ManagerScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useManagerPreview } from '../../context/ManagerPreviewContext';
import { useManagerProperties } from '../../hooks/manager/useManagerProperties';
import { colors, spacing } from '../../theme';
import type { ManagerPropertiesStackParamList } from '../../types/navigation.types';
import { getManagerBottomContentPadding } from '../../utils/manager-layout';

export function ManagerPropertiesScreen({
  navigation,
}: StackScreenProps<ManagerPropertiesStackParamList, 'ManagerPropertiesList'>) {
  const { user } = useAuth();
  const preview = useManagerPreview();
  const insets = useSafeAreaInsets();
  const propertiesQuery = useManagerProperties(user?.id);

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
          icon="business-outline"
          subtitle="View listings connected to your manager account."
          title="Properties"
        />
        <ManagerEmptyState
          description="Live property cards will appear here for signed-in house managers."
          icon="business-outline"
          title="Properties preview"
        />
      </ScrollView>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <ManagerEmptyState
          description="Sign in as a house manager to view your properties."
          icon="business-outline"
          title="Properties unavailable"
        />
      </View>
    );
  }

  if (propertiesQuery.isLoading) {
    return <LoadingState message="Loading properties" />;
  }

  if (propertiesQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          description={
            propertiesQuery.error instanceof Error
              ? propertiesQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => {
            void propertiesQuery.refetch();
          }}
          title="Could not load properties"
        />
      </View>
    );
  }

  const properties = propertiesQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
      ]}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void propertiesQuery.refetch();
          }}
          refreshing={propertiesQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
      style={styles.screen}
    >
      <ManagerScreenHeader
        icon="business-outline"
        subtitle="View listings connected to your manager account."
        title="Properties"
      />

      {properties.length === 0 ? (
        <ManagerEmptyState
          description="Property creation will be added in a later unit. For now, properties from your account will appear here."
          icon="business-outline"
          title="No properties yet"
        />
      ) : (
        <View style={styles.list}>
          {properties.map((property) => (
            <ManagerPropertyCard
              key={property.id}
              onPress={() =>
                navigation.navigate('ManagerPropertyDetail', {
                  propertyId: property.id,
                })
              }
              property={property}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
