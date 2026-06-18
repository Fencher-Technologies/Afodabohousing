import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

type IllustrationVariant = 'manager' | 'overview' | 'tenant';

interface OnboardingIllustrationProps {
  variant: IllustrationVariant;
}

export function OnboardingIllustration({ variant }: OnboardingIllustrationProps) {
  if (variant === 'tenant') {
    return <TenantIllustration />;
  }

  if (variant === 'manager') {
    return <ManagerIllustration />;
  }

  return <OverviewIllustration />;
}

function OverviewIllustration() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.blob, styles.overviewBlob]} />
      <View style={styles.phoneShell}>
        <View style={styles.phoneHandle} />
        <View style={styles.propertyHero}>
          <View style={styles.houseMark}>
            <Ionicons color={colors.primaryForeground} name="home" size={30} />
          </View>
          <View style={styles.locationPin}>
            <Ionicons color={colors.accent} name="location" size={22} />
          </View>
        </View>
        <View style={styles.workflowRow}>
          <WorkflowTile icon="key-outline" tone="gold" />
          <WorkflowTile icon="wallet-outline" tone="green" />
          <WorkflowTile icon="chatbubbles-outline" tone="terracotta" />
        </View>
      </View>
      <Connector fromStyle={styles.overviewConnectorLeft} />
      <Connector fromStyle={styles.overviewConnectorRight} />
      <FloatingTask icon="document-text-outline" positionStyle={styles.overviewLease} tone="gold" />
      <FloatingTask
        icon="receipt-outline"
        positionStyle={styles.overviewReceipt}
        tone="terracotta"
      />
    </View>
  );
}

function TenantIllustration() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.blob, styles.tenantBlob]} />
      <View style={[styles.flowPath, styles.tenantFlowPath]} />
      <View style={[styles.sceneCard, styles.leaseScene]}>
        <IconDisc icon="home-outline" tone="green" />
        <View style={styles.documentStack}>
          <Line tone="green" width={94} />
          <Line tone="gold" width={66} />
          <Line tone="muted" width={48} />
        </View>
        <View style={styles.keyDisc}>
          <Ionicons color={colors.primary} name="key-outline" size={22} />
        </View>
      </View>
      <View style={[styles.sceneCard, styles.uploadScene]}>
        <IconDisc icon="receipt-outline" tone="gold" />
        <View style={styles.uploadTarget}>
          <Ionicons color={colors.accent} name="cloud-upload-outline" size={31} />
          <View style={styles.uploadArrowDot} />
        </View>
      </View>
      <View style={[styles.chatPair, styles.tenantChatPair]}>
        <View style={styles.managerAvatar}>
          <Ionicons color={colors.primary} name="person" size={24} />
        </View>
        <View style={styles.chatCard}>
          <Ionicons color={colors.accent} name="chatbubble-ellipses-outline" size={23} />
          <Line tone="gold" width={28} />
        </View>
      </View>
    </View>
  );
}

function ManagerIllustration() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.blob, styles.managerBlob]} />
      <View style={styles.managerTablet}>
        <View style={styles.managerTopRow}>
          <IconDisc icon="business-outline" tone="green" />
          <View style={styles.reviewBadge}>
            <Ionicons color={colors.primaryForeground} name="checkmark" size={27} />
          </View>
        </View>
        <View style={styles.propertyRows}>
          <PropertyRow icon="home-outline" />
          <PropertyRow icon="business-outline" compact />
          <PropertyRow icon="location-outline" />
        </View>
      </View>
      <View style={[styles.sceneCard, styles.paymentReviewScene]}>
        <Ionicons color={colors.accent} name="receipt-outline" size={30} />
        <View style={styles.approveStamp}>
          <Ionicons color={colors.primaryForeground} name="checkmark-circle" size={29} />
        </View>
      </View>
      <View style={[styles.chatPair, styles.managerChatPair]}>
        <View style={styles.chatCard}>
          <Ionicons color={colors.primary} name="chatbubbles-outline" size={24} />
          <Line tone="green" width={30} />
        </View>
      </View>
    </View>
  );
}

function WorkflowTile({
  icon,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'gold' | 'green' | 'terracotta';
}) {
  const color = tone === 'green' ? colors.primary : tone === 'gold' ? colors.gold : colors.accent;
  const backgroundColor =
    tone === 'green'
      ? colors.primarySoft
      : tone === 'gold'
        ? colors.surfaceMuted
        : colors.accentSoft;

  return (
    <View style={[styles.workflowTile, { backgroundColor }]}>
      <Ionicons color={color} name={icon} size={22} />
      <View style={[styles.workflowLine, { backgroundColor: color }]} />
    </View>
  );
}

function FloatingTask({
  icon,
  positionStyle,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  positionStyle: StyleProp<ViewStyle>;
  tone: 'gold' | 'terracotta';
}) {
  return (
    <View style={[styles.floatingTask, positionStyle]}>
      <Ionicons color={tone === 'gold' ? colors.gold : colors.accent} name={icon} size={29} />
      <View style={styles.floatingTaskLine} />
    </View>
  );
}

function Connector({ fromStyle }: { fromStyle: StyleProp<ViewStyle> }) {
  return <View style={[styles.connector, fromStyle]} />;
}

function IconDisc({
  icon,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'gold' | 'green';
}) {
  return (
    <View style={[styles.iconDisc, tone === 'gold' ? styles.iconDiscGold : styles.iconDiscGreen]}>
      <Ionicons color={tone === 'gold' ? colors.warning : colors.primary} name={icon} size={26} />
    </View>
  );
}

function Line({ tone, width }: { tone: 'gold' | 'green' | 'muted'; width: number }) {
  const backgroundColor =
    tone === 'green' ? colors.primary : tone === 'gold' ? colors.gold : colors.border;

  return <View style={[styles.line, { backgroundColor, width }]} />;
}

function PropertyRow({
  compact = false,
  icon,
}: {
  compact?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.propertyRow}>
      <View style={styles.propertyRowIcon}>
        <Ionicons color={colors.primary} name={icon} size={18} />
      </View>
      <View style={styles.propertyRowLines}>
        <Line tone="green" width={compact ? 58 : 78} />
        <Line tone="muted" width={compact ? 44 : 58} />
      </View>
      <View style={styles.propertyStatusDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  approveStamp: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  blob: {
    borderRadius: radii.pill,
    height: 168,
    opacity: 0.9,
    position: 'absolute',
    width: 168,
  },
  canvas: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 250,
    justifyContent: 'center',
    width: '100%',
  },
  chatCard: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xs,
    height: 62,
    justifyContent: 'center',
    width: 72,
  },
  chatPair: {
    position: 'absolute',
  },
  connector: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 5,
    position: 'absolute',
    width: 56,
  },
  documentStack: {
    flex: 1,
    gap: spacing.xs,
  },
  floatingTask: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xs,
    height: 74,
    justifyContent: 'center',
    position: 'absolute',
    width: 76,
  },
  floatingTaskLine: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 5,
    width: 32,
  },
  flowPath: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 5,
    position: 'absolute',
    width: 190,
  },
  houseMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  iconDisc: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  iconDiscGold: {
    backgroundColor: colors.surfaceMuted,
  },
  iconDiscGreen: {
    backgroundColor: colors.primarySoft,
  },
  keyDisc: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  leaseScene: {
    flexDirection: 'row',
    gap: spacing.sm,
    left: 24,
    padding: spacing.md,
    top: 28,
    width: 238,
  },
  line: {
    borderRadius: radii.pill,
    height: 7,
  },
  locationPin: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  managerAvatar: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  managerBlob: {
    backgroundColor: colors.primarySoft,
    right: 36,
    top: 8,
  },
  managerChatPair: {
    bottom: 24,
    right: 38,
  },
  managerTablet: {
    ...shadows.floating,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    width: 234,
  },
  managerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewBlob: {
    backgroundColor: colors.surfaceMuted,
    left: 38,
    top: 10,
  },
  overviewConnectorLeft: {
    bottom: 78,
    left: 96,
    transform: [{ rotate: '-18deg' }],
  },
  overviewConnectorRight: {
    bottom: 76,
    right: 96,
    transform: [{ rotate: '18deg' }],
  },
  overviewLease: {
    bottom: 24,
    left: 42,
  },
  overviewReceipt: {
    bottom: 24,
    right: 42,
  },
  paymentReviewScene: {
    alignItems: 'center',
    bottom: 26,
    flexDirection: 'row',
    gap: spacing.sm,
    left: 32,
    padding: spacing.md,
  },
  phoneHandle: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 6,
    width: 54,
  },
  phoneShell: {
    ...shadows.floating,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 30,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: 194,
  },
  propertyHero: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 78,
    padding: spacing.sm,
  },
  propertyRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  propertyRowIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  propertyRowLines: {
    flex: 1,
    gap: spacing.xs,
  },
  propertyRows: {
    gap: spacing.sm,
  },
  propertyStatusDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 10,
    width: 10,
  },
  reviewBadge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderColor: colors.gold,
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  sceneCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    position: 'absolute',
  },
  tenantBlob: {
    backgroundColor: colors.accentSoft,
    right: 38,
    top: 16,
  },
  tenantChatPair: {
    alignItems: 'center',
    bottom: 22,
    flexDirection: 'row',
    gap: spacing.xs,
    left: 34,
  },
  tenantFlowPath: {
    transform: [{ rotate: '-18deg' }],
  },
  uploadArrowDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 8,
    marginTop: spacing.xs,
    width: 8,
  },
  uploadScene: {
    alignItems: 'center',
    bottom: 30,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    right: 28,
  },
  uploadTarget: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    width: 66,
  },
  workflowLine: {
    borderRadius: radii.pill,
    height: 5,
    width: 26,
  },
  workflowRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  workflowTile: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    gap: spacing.xs,
    height: 64,
    justifyContent: 'center',
    width: 58,
  },
});
