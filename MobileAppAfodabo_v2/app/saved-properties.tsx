/**
 * Saved Properties — the bookmarks a user has kept.
 *
 * Bookmarks existed on the backend and the web app, but the mobile bookmark
 * button was local state and there was nowhere to see saved properties.
 */

import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Bookmark } from "lucide-react-native";

import { Colors, Spacing } from "@/constants/theme";
import { EmptyState } from "@/src/components/EmptyState";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingState } from "@/src/components/LoadingState";
import { PageHeader } from "@/src/components/PageHeader";
import { PropertyCard } from "@/src/components/PropertyCard";
import { useBookmarks } from "@/src/hooks/useBookmarks";
import { fromBackendProperty } from "@/src/mappers/property-mapper";

export default function SavedPropertiesScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useBookmarks();

  const properties = (data ?? [])
    .map((b) => (b.property ? fromBackendProperty(b.property) : null))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (isLoading) return <LoadingState message="Loading saved properties…" />;
  if (isError) {
    return <ErrorState description="Could not load your saved properties." onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Saved Properties" onBack={() => router.back()} />
      <FlatList
        data={properties}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Bookmark size={40} color={Colors.textMuted} />}
            title="No saved properties"
            description="Tap the bookmark icon on a property to save it here."
            actionLabel="Browse properties"
            onAction={() => router.push("/guest/explore")}
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            totalUnits={item.unit_count}
            onPress={() => router.push(`/property-detail?id=${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
});
