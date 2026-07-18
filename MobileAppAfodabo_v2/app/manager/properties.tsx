import { useMemo, useState, useCallback } from "react";
import { StyleSheet, Text, View, FlatList, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Plus, Building2, Home, CheckCircle2, XCircle } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { PropertyCard } from "@/src/components/PropertyCard";
import { EmptyState } from "@/src/components/EmptyState";
import { SearchInput } from "@/src/components/SearchInput";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { usePropertyList } from "@/src/hooks/useProperties";
import { useRefresh } from "@/src/hooks/useRefresh";

export default function ManagerPropertiesScreen() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "occupied" | "inactive">("all");
  const { data, isLoading, error, refetch } = usePropertyList();
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetch] });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const properties = data?.items ?? [];

  const filtered = useMemo(() => {
    let list = properties;
    if (statusFilter === "available") {
      list = list.filter((p) => p.occupancy_status === "available" && p.status === "active");
    } else if (statusFilter === "occupied") {
      list = list.filter((p) => p.occupancy_status === "occupied" && p.status === "active");
    } else if (statusFilter === "inactive") {
      list = list.filter((p) => p.status === "inactive");
    }
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (p) => p.title.toLowerCase().includes(q) || p.district.toLowerCase().includes(q)
    );
  }, [query, statusFilter, properties]);

  if (isLoading) {
    return <LoadingState message="Loading properties…" />;
  }

  if (error) {
    return (
      <Screen scroll>
        <ErrorState
          title="Could not load properties"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Properties</Text>
            <Text style={styles.subtitle}>{properties.length} properties</Text>
          </View>
          <Button
            label="List New"
            onPress={() => router.push("/create-property")}
            size="sm"
            leftIcon={<Plus size={18} color={Colors.textOnPrimary} />}
          />
        </View>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search properties…"
        />
      </View>

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setStatusFilter("all")}
          style={[styles.filterChip, statusFilter === "all" && styles.filterChipActive]}
        >
          <Home size={14} color={statusFilter === "all" ? Colors.textOnPrimary : Colors.textSecondary} />
          <Text style={[styles.filterChipText, statusFilter === "all" && styles.filterChipTextActive]}>All</Text>
        </Pressable>
        <Pressable
          onPress={() => setStatusFilter("available")}
          style={[styles.filterChip, statusFilter === "available" && styles.filterChipActiveSuccess]}
        >
          <CheckCircle2 size={14} color={statusFilter === "available" ? Colors.textOnPrimary : Colors.success} />
          <Text style={[styles.filterChipText, statusFilter === "available" && styles.filterChipTextActive]}>Available</Text>
        </Pressable>
        <Pressable
          onPress={() => setStatusFilter("occupied")}
          style={[styles.filterChip, statusFilter === "occupied" && styles.filterChipActiveWarn]}
        >
          <XCircle size={14} color={statusFilter === "occupied" ? Colors.textOnPrimary : Colors.warning} />
          <Text style={[styles.filterChipText, statusFilter === "occupied" && styles.filterChipTextActive]}>Occupied</Text>
        </Pressable>
        <Pressable
          onPress={() => setStatusFilter("inactive")}
          style={[styles.filterChip, statusFilter === "inactive" && styles.filterChipActiveMuted]}
        >
          <Building2 size={14} color={statusFilter === "inactive" ? Colors.textOnPrimary : Colors.textMuted} />
          <Text style={[styles.filterChipText, statusFilter === "inactive" && styles.filterChipTextActive]}>Inactive</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 size={32} color={Colors.primary} />}
            title="No properties here"
            description="Try a different filter or list a new property."
            actionLabel="List New Property"
            onAction={() => router.push("/create-property")}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                onPress={() => router.push(`/property-detail?id=${item.id}&role=manager`)}
                showStatus
              />
            )}
            scrollEnabled={false}
            contentContainerStyle={{ gap: Spacing.md }}
          />
        )}
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipActiveSuccess: {
    backgroundColor: Colors.success,
  },
  filterChipActiveWarn: {
    backgroundColor: Colors.warning,
  },
  filterChipActiveMuted: {
    backgroundColor: Colors.textMuted,
  },
  filterChipText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textOnPrimary,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
