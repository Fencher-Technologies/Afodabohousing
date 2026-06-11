import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useManagerPreview } from '../../context/ManagerPreviewContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { ManagerTabParamList } from '../../types/navigation.types';

interface ManagerDrawerMenuProps {
  activeRoute?: keyof ManagerTabParamList;
  onClose: () => void;
  onNavigate: (routeName: keyof ManagerTabParamList) => void;
  visible: boolean;
}

const drawerItems: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  routeName: keyof ManagerTabParamList;
}[] = [
  { icon: 'business-outline', label: 'Properties', routeName: 'Properties' },
  { icon: 'key-outline', label: 'Tenancies', routeName: 'Tenancies' },
];

const supportItems: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  routeName: keyof ManagerTabParamList;
}[] = [
  { icon: 'information-circle-outline', label: 'About', routeName: 'About' },
  { icon: 'help-circle-outline', label: 'Contact Support', routeName: 'Contact' },
  { icon: 'shield-checkmark-outline', label: 'Privacy', routeName: 'Privacy' },
  { icon: 'document-text-outline', label: 'Terms', routeName: 'Terms' },
];

export function ManagerDrawerMenu({
  activeRoute,
  onClose,
  onNavigate,
  visible,
}: ManagerDrawerMenuProps) {
  const insets = useSafeAreaInsets();
  const { profile, signOut, user } = useAuth();
  const preview = useManagerPreview();
  const displayName = preview.enabled
    ? 'Manager Preview'
    : profile?.full_name || user?.email || 'Manager';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.scrim} />
        <View style={[styles.drawer, { paddingTop: insets.top + spacing.md }]}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + spacing.lg },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profilePanel}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.profileCopy}>
                  <Text numberOfLines={1} style={styles.profileName}>
                    {displayName}
                  </Text>
                  <Text style={styles.profileRole}>
                    {preview.enabled ? 'UI preview mode' : 'House manager'}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                  <Ionicons color={colors.sidebarText} name="close" size={20} />
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Management</Text>
              {drawerItems.map((item) => {
                const active = activeRoute === item.routeName;

                return (
                  <Pressable
                    key={item.routeName}
                    onPress={() => {
                      onClose();
                      onNavigate(item.routeName);
                    }}
                    style={({ pressed }) => [
                      styles.navItem,
                      active && styles.activeNavItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.navIcon, active && styles.activeNavIcon]}>
                      <Ionicons
                        color={active ? colors.sidebarActiveText : colors.sidebarText}
                        name={item.icon}
                        size={19}
                      />
                    </View>
                    <Text style={[styles.navText, active && styles.activeNavText]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Support</Text>
              {supportItems.map((item) => {
                const active = activeRoute === item.routeName;

                return (
                  <Pressable
                    key={item.routeName}
                    onPress={() => {
                      onClose();
                      onNavigate(item.routeName);
                    }}
                    style={({ pressed }) => [
                      styles.navItem,
                      active && styles.activeNavItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.navIcon, active && styles.activeNavIcon]}>
                      <Ionicons
                        color={active ? colors.sidebarActiveText : colors.sidebarText}
                        name={item.icon}
                        size={19}
                      />
                    </View>
                    <Text style={[styles.navText, active && styles.activeNavText]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                onClose();
                if (preview.enabled) {
                  preview.exitPreview();
                  return;
                }

                void signOut();
              }}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
            >
              <Ionicons
                color={colors.accentForeground}
                name={preview.enabled ? 'close-circle-outline' : 'log-out-outline'}
                size={20}
              />
              <View style={styles.logoutCopy}>
                <Text style={styles.logoutText}>{preview.enabled ? 'Exit Preview' : 'Logout'}</Text>
                <Text style={styles.logoutMeta}>
                  {preview.enabled ? 'Return to login' : 'End this manager session'}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.sidebarActive,
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: {
    color: colors.sidebarActiveText,
    fontFamily: typography.bodyStrong,
    fontSize: 18,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.sidebarHover,
    borderColor: colors.sidebarBorder,
    borderWidth: 1,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    opacity: 0.9,
    width: 38,
  },
  drawer: {
    ...shadows.floating,
    backgroundColor: colors.sidebar,
    borderBottomRightRadius: radii.modal,
    borderColor: colors.sidebarBorder,
    borderRightWidth: 1,
    borderTopRightRadius: radii.modal,
    height: '100%',
    paddingHorizontal: spacing.md,
    width: '82%',
  },
  activeNavIcon: {
    backgroundColor: colors.sidebarActive,
  },
  activeNavItem: {
    backgroundColor: colors.sidebarActive,
  },
  activeNavText: {
    color: colors.sidebarActiveText,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.input,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutCopy: {
    flex: 1,
    gap: 2,
  },
  logoutMeta: {
    color: colors.accentForeground,
    fontFamily: typography.body,
    fontSize: 12,
    opacity: 0.82,
  },
  logoutText: {
    color: colors.accentForeground,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: radii.card,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 54,
    padding: spacing.sm,
  },
  navIcon: {
    alignItems: 'center',
    backgroundColor: colors.sidebarHover,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  navText: {
    color: colors.sidebarText,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.78,
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    color: colors.sidebarText,
    fontFamily: typography.displayStrong,
    fontSize: 22,
  },
  profileRole: {
    color: colors.sidebarText,
    fontFamily: typography.body,
    fontSize: 13,
    opacity: 0.78,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  profilePanel: {
    backgroundColor: colors.sidebarHover,
    borderColor: colors.sidebarBorder,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  scrollContent: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.sidebarActive,
    fontFamily: typography.bodyStrong,
    fontSize: 11,
    paddingHorizontal: spacing.sm,
    textTransform: 'uppercase',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
});
