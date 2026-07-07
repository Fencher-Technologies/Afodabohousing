import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from './badge';
import { Button } from './button';
import { InputField } from './input-field';
import { SelectField } from './select-field';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

export interface ListFilters {
  dateFrom?: string;
  dateTo?: string;
  manager?: string;
  occupancy?: string;
  paymentStatus?: string;
  propertyId?: string;
  search?: string;
  tenantId?: string;
}

interface AdvancedFilterModalProps {
  filters: ListFilters;
  onApply: (filters: ListFilters) => void;
  onClear: () => void;
  showDateRange?: boolean;
  showManager?: boolean;
  showOccupancy?: boolean;
  showPaymentStatus?: boolean;
  showProperty?: boolean;
  showSearch?: boolean;
  showTenant?: boolean;
  title: string;
}

const occupancyOptions = [
  { label: 'Any occupancy', value: '' },
  { label: 'Available', value: 'available' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Unlisted', value: 'unlisted' },
];

const paymentStatusOptions = [
  { label: 'Any status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Uploaded', value: 'uploaded' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

function compact(filters: ListFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value.trim() !== ''),
  ) as ListFilters;
}

export function getActiveFilterCount(filters: ListFilters) {
  return Object.keys(compact(filters)).length;
}

export function AdvancedFilterModal({
  filters,
  onApply,
  onClear,
  showDateRange,
  showManager,
  showOccupancy,
  showPaymentStatus,
  showProperty,
  showSearch = true,
  showTenant,
  title,
}: AdvancedFilterModalProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ListFilters>(filters);
  const activeFilters = useMemo(() => compact(filters), [filters]);
  const activeCount = Object.keys(activeFilters).length;

  const openModal = () => {
    setDraft(filters);
    setOpen(true);
  };

  const apply = () => {
    onApply(compact(draft));
    setOpen(false);
  };

  const clear = () => {
    setDraft({});
    onClear();
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.toolbar}>
        <Button onPress={openModal} variant={activeCount > 0 ? 'primary' : 'outline'}>
          <View style={styles.filterButtonContent}>
            <Feather
              color={activeCount > 0 ? colors.primaryForeground : colors.textPrimary}
              name="filter"
              size={17}
            />
            <Text
              style={[
                styles.filterButtonText,
                { color: activeCount > 0 ? colors.primaryForeground : colors.textPrimary },
              ]}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Text>
          </View>
        </Button>
        {activeCount > 0 ? (
          <Button onPress={onClear} variant="ghost">
            Clear
          </Button>
        ) : null}
      </View>

      {activeCount > 0 ? (
        <View style={styles.chips}>
          {Object.entries(activeFilters).map(([key, value]) => (
            <Badge key={key} tone="primary">
              {key}: {value}
            </Badge>
          ))}
        </View>
      ) : null}

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                accessibilityLabel="Close filters"
                onPress={() => setOpen(false)}
                style={styles.iconButton}
              >
                <Feather color={colors.textPrimary} name="x" size={20} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
              {showSearch ? (
                <InputField
                  autoCapitalize="none"
                  label="Search"
                  onChangeText={(search) => setDraft((current) => ({ ...current, search }))}
                  placeholder="Name, address, notes"
                  value={draft.search ?? ''}
                />
              ) : null}
              {showProperty ? (
                <InputField
                  autoCapitalize="none"
                  label="Property ID"
                  onChangeText={(propertyId) =>
                    setDraft((current) => ({ ...current, propertyId }))
                  }
                  placeholder="Property UUID"
                  value={draft.propertyId ?? ''}
                />
              ) : null}
              {showTenant ? (
                <InputField
                  autoCapitalize="none"
                  label="Tenant ID"
                  onChangeText={(tenantId) => setDraft((current) => ({ ...current, tenantId }))}
                  placeholder="Tenant UUID"
                  value={draft.tenantId ?? ''}
                />
              ) : null}
              {showManager ? (
                <InputField
                  autoCapitalize="none"
                  label="Manager"
                  onChangeText={(manager) => setDraft((current) => ({ ...current, manager }))}
                  placeholder="Manager email or ID"
                  value={draft.manager ?? ''}
                />
              ) : null}
              {showOccupancy ? (
                <SelectField
                  label="Occupancy"
                  onChange={(occupancy) => setDraft((current) => ({ ...current, occupancy }))}
                  options={occupancyOptions}
                  placeholder="Any occupancy"
                  value={draft.occupancy ?? ''}
                />
              ) : null}
              {showPaymentStatus ? (
                <SelectField
                  label="Payment status"
                  onChange={(paymentStatus) =>
                    setDraft((current) => ({ ...current, paymentStatus }))
                  }
                  options={paymentStatusOptions}
                  placeholder="Any status"
                  value={draft.paymentStatus ?? ''}
                />
              ) : null}
              {showDateRange ? (
                <View style={styles.dateGrid}>
                  <InputField
                    autoCapitalize="none"
                    label="From"
                    onChangeText={(dateFrom) => setDraft((current) => ({ ...current, dateFrom }))}
                    placeholder="YYYY-MM-DD"
                    value={draft.dateFrom ?? ''}
                  />
                  <InputField
                    autoCapitalize="none"
                    label="To"
                    onChangeText={(dateTo) => setDraft((current) => ({ ...current, dateTo }))}
                    placeholder="YYYY-MM-DD"
                    value={draft.dateTo ?? ''}
                  />
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.actions}>
              <Button onPress={apply}>Apply Filters</Button>
              <Button onPress={clear} variant="outline">
                Clear All
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dateGrid: {
    gap: spacing.sm,
  },
  filterButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterButtonText: {
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  form: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sheet: {
    ...shadows.floating,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.md,
    maxHeight: '86%',
    maxWidth: 480,
    padding: spacing.lg,
    width: '100%',
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.display,
    fontSize: 24,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  wrapper: {
    gap: spacing.sm,
  },
});
