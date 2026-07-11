import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { PropertyCard } from '../components/property-card';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { fetchBookmarks } from '../services/favorites';
import { fetchProperties } from '../services/properties';
import { colors, spacing, typography } from '../theme/tokens';
import type { PropertyRow } from '../types/supabase';
import type { RootStackParamList } from '../navigation/types';

export function FavoritesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const bookmarksQuery = useQuery({
    queryFn: fetchBookmarks,
    queryKey: ['favorites'],
  });

  const propertiesQuery = useQuery({
    enabled: Boolean(bookmarksQuery.data?.length),
    queryFn: () => fetchProperties({}),
    queryKey: ['favorite-properties'],
  });

  const favoritePropertyIds = useMemo(
    () => new Set((bookmarksQuery.data ?? []).map((b) => b.property_id)),
    [bookmarksQuery.data],
  );

  const allProperties = propertiesQuery.data?.properties ?? [];
  const properties = useMemo(
    () => allProperties.filter((p) => favoritePropertyIds.has(p.id)),
    [allProperties, favoritePropertyIds],
  );

  const handleRefresh = useCallback(() => {
    void bookmarksQuery.refetch();
    void propertiesQuery.refetch();
  }, [bookmarksQuery, propertiesQuery]);

  if (bookmarksQuery.isLoading) {
    return <LoadingState message="Loading your favorites" />;
  }

  if (bookmarksQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            bookmarksQuery.error instanceof Error
              ? bookmarksQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => void bookmarksQuery.refetch()}
          title="Could not load favorites"
        />
      </ScrollableScreenContainer>
    );
  }

  if (bookmarksQuery.data?.length === 0) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Tap the heart icon on any property to save it here."
          title="No favorites yet"
        />
      </ScrollableScreenContainer>
    );
  }

  return (
    <ScrollableScreenContainer
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={handleRefresh}
          refreshing={propertiesQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.count}>
        {bookmarksQuery.data?.length ?? 0} saved
        {(bookmarksQuery.data?.length ?? 0) === 1 ? ' property' : ' properties'}
      </Text>
      <View style={styles.list}>
        {properties.map((property: PropertyRow, index: number) => (
          <PropertyCard
            key={property.id}
            index={index}
            onPress={() => navigation.navigate('PropertyDetails', { propertyId: property.id })}
            property={property}
          />
        ))}
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  count: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  list: {
    gap: spacing.md,
  },
});
