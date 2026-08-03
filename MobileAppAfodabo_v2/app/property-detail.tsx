import { useEffect, useRef, useState } from "react";
import { Share, StyleSheet, Text, View, Pressable, Alert, Linking, ScrollView, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import {
  MapPin,
  BedDouble,
  Bath,
  Share2,
  Phone,
  Mail,
  Navigation,
  MessageCircle,
  Pencil,
  Trash2,
  Power,
  Bookmark,
  Check,
  Maximize2,
  Calendar,
  Car,
  Star,
  Sparkles,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { useAuth } from "@/src/context/auth-context";
import { useProperty, usePublicProperty, useDeleteProperty, useUpdateProperty } from "@/src/hooks/useProperties";
import { formatUGX, formatPropertyType, formatAmenity, formatDate } from "@/src/utils/format";
import { MessageTemplates, openWhatsApp } from "@/src/utils/whatsapp";

export default function PropertyDetailScreen() {
  const { id, role } = useLocalSearchParams<{ id: string; role: string }>();
  const isManager = role === "manager";

  const { user } = useAuth();
  const authQuery = useProperty(id ?? "", { enabled: isManager });
  const publicQuery = usePublicProperty(id ?? "", { enabled: !isManager });
  const { data: property, isLoading, error } = isManager ? authQuery : publicQuery;

  const deleteMutation = useDeleteProperty();
  const updateMutation = useUpdateProperty();
  const refetch = isManager ? authQuery.refetch : publicQuery.refetch;
  const [bookmarked, setBookmarked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    setCurrentImageIndex(0);
    imageScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [id]);

  const requireAuth = (action: string) => {
    if (user) return true;
    Alert.alert("Sign in required", `Please sign in to ${action}.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign In", onPress: () => router.push("/login") },
      { text: "Create Account", onPress: () => router.push("/register") },
    ]);
    return false;
  };

  if (isLoading) return <LoadingState message="Loading property…" />;
  if (error || !property) {
    return (
      <Screen scroll>
        <ErrorState title="Property not found" description="This property may have been removed." onRetry={refetch} />
      </Screen>
    );
  }

  const hasImage = property.images.length > 0;
  const phone = property.manager_phone || "";
  const email = property.manager_email || "";
  const hasParking = property.amenities.includes("parking" as any);

  const handleInquiry = () => {
    if (phone) {
      openWhatsApp(phone, MessageTemplates.inquiry(property.title));
    } else {
      Alert.alert("Contact unavailable", "The manager has not provided a phone number.");
    }
  };

  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert("Contact unavailable", "The manager has not provided a phone number.");
    }
  };

  const handleEmail = () => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    } else {
      Alert.alert("Contact unavailable", "The manager has not provided an email address.");
    }
  };

  const handleViewLocation = () => {
    if (property.lat && property.lng) {
      Linking.openURL(`https://www.google.com/maps?q=${property.lat},${property.lng}`);
    } else {
      const address = [property.address, property.city, property.district].filter(Boolean).join(", ");
      Linking.openURL(`https://www.google.com/maps?q=${encodeURIComponent(address)}`);
    }
  };

  const handleGetDirections = () => {
    if (property.lat && property.lng) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}`);
    } else {
      const address = [property.address, property.city, property.district].filter(Boolean).join(", ");
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`);
    }
  };

  const handleMessage = () => {
    if (phone) {
      openWhatsApp(phone, MessageTemplates.generic(`Hello, I'm interested in ${property.title}.`));
    } else {
      Alert.alert("Contact unavailable", "The manager has not provided a phone number.");
    }
  };

  const handleShare = async () => {
    const details = [
      `Property: ${property.title}`,
      `Location: ${[property.address, property.city, property.district].filter(Boolean).join(", ")}`,
      `Rent: ${formatUGX(property.rent_amount)}/month`,
      `Type: ${formatPropertyType(property.type)}`,
      property.beds > 0 ? `Bedrooms: ${property.beds}` : null,
      property.baths > 0 ? `Bathrooms: ${property.baths}` : null,
      property.description ? `\n${property.description}` : null,
      property.amenities.length > 0 ? `\nAmenities: ${property.amenities.map(formatAmenity).join(", ")}` : null,
      property.manager_phone ? `\nContact: ${property.manager_phone}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await Share.share({ message: details, title: property.title });
    } catch {
      // user cancelled
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Property", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(property.id);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete property. Please try again.");
          }
        },
      },
    ]);
  };

  const handleToggleOccupancy = () => {
    const willBeOccupied = property.occupancy_status !== "occupied";
    Alert.alert(
      willBeOccupied ? "Mark as Occupied" : "Mark as Available",
      willBeOccupied ? "This will mark the property as occupied." : "This will mark the property as available for rent.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: async () => {
            try {
              await updateMutation.mutateAsync({ id: property.id, data: { status: willBeOccupied ? "occupied" : "available" } });
            } catch {
              Alert.alert("Error", "Could not update occupancy status.");
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = () => {
    const willBeActive = property.status !== "active";
    Alert.alert(
      willBeActive ? "Activate Property" : "Deactivate Property",
      willBeActive ? "This will make the property visible to the public." : "This will hide the property from public listings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: async () => {
            try {
              await updateMutation.mutateAsync({ id: property.id, data: { is_active: willBeActive } });
            } catch {
              Alert.alert("Error", "Could not update property status.");
            }
          },
        },
      ]
    );
  };

  return (
    <Screen scroll>
      {/* Image Gallery */}
      <View style={styles.imageWrap}>
        {hasImage ? (
          <>
            <ScrollView
              ref={imageScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(Math.max(0, Math.min(index, property.images.length - 1)));
              }}
              style={styles.image}
            >
              {property.images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[styles.image, { width }]}
                  contentFit="cover"
                  recyclingKey={uri}
                />
              ))}
            </ScrollView>
            {property.images.length > 1 && (
              <>
                <View style={styles.imageDots}>
                  {property.images.map((_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setCurrentImageIndex(i);
                        imageScrollRef.current?.scrollTo({ x: i * width, animated: true });
                      }}
                      style={[styles.imageDot, i === currentImageIndex && styles.imageDotActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Image ${i + 1} of ${property.images.length}`}
                    />
                  ))}
                </View>
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {property.images.length}
                  </Text>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>{property.title}</Text>
          </View>
        )}
        <View style={styles.imageBadges}>
          <Badge label={formatPropertyType(property.type)} tone="primary" size="md" />
          <Badge
            label={property.occupancy_status === "occupied" ? "Occupied" : "Available"}
            tone={property.occupancy_status === "occupied" ? "warning" : "success"}
            size="md"
          />
          {property.status !== "active" && (
            <Badge label="Inactive" tone="muted" size="md" />
          )}
          {property.is_boosted && (
            <Badge label="★ Boosted" tone="gold" size="md" />
          )}
        </View>
        <Pressable
          onPress={() => {
            if (!requireAuth("save properties")) return;
            setBookmarked(!bookmarked);
          }}
          style={styles.bookmarkBtn}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          <Bookmark size={22} color={bookmarked ? Colors.gold : Colors.textOnPrimary} fill={bookmarked ? Colors.gold : "none"} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Title & Location */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{property.title}</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color={Colors.textMuted} />
            <Text style={styles.locationText}>{[property.address, property.city, property.district].filter(Boolean).join(", ")}</Text>
          </View>
          <Text style={styles.price}>{formatUGX(property.rent_amount)}<Text style={styles.pricePeriod}>/month</Text></Text>
        </View>

        {/* Quick Details */}
        <Card padding="md">
          <View style={styles.quickDetails}>
            {property.beds > 0 && (
              <View style={styles.quickDetailItem}>
                <BedDouble size={20} color={Colors.primary} />
                <Text style={styles.quickDetailValue}>{property.beds}</Text>
                <Text style={styles.quickDetailLabel}>Beds</Text>
              </View>
            )}
            {property.baths > 0 && (
              <View style={styles.quickDetailItem}>
                <Bath size={20} color={Colors.primary} />
                <Text style={styles.quickDetailValue}>{property.baths}</Text>
                <Text style={styles.quickDetailLabel}>Baths</Text>
              </View>
            )}
            {hasParking && (
              <View style={styles.quickDetailItem}>
                <Car size={20} color={Colors.primary} />
                <Text style={styles.quickDetailValue}>Yes</Text>
                <Text style={styles.quickDetailLabel}>Parking</Text>
              </View>
            )}
            {property.square_feet != null && property.square_feet > 0 && (
              <View style={styles.quickDetailItem}>
                <Maximize2 size={20} color={Colors.primary} />
                <Text style={styles.quickDetailValue}>{property.square_feet}</Text>
                <Text style={styles.quickDetailLabel}>Sq Ft</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Description */}
        {property.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>
        ) : null}

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {property.amenities.map((amenity) => (
                <View key={amenity} style={styles.amenityChip}>
                  <Check size={14} color={Colors.success} />
                  <Text style={styles.amenityText}>{formatAmenity(amenity)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Security Deposit */}
        {property.security_deposit != null && property.security_deposit > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deposit</Text>
            <Text style={styles.description}>{formatUGX(property.security_deposit)}</Text>
          </View>
        )}

        {/* Date Listed */}
        {property.created_at ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date Listed</Text>
            <View style={styles.dateRow}>
              <Calendar size={16} color={Colors.textMuted} />
              <Text style={styles.dateText}>{formatDate(property.created_at)}</Text>
            </View>
          </View>
        ) : null}

        {/* Location / Directions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Card padding="md">
            {property.lat && property.lng ? (
              <View style={styles.locationBtns}>
                <Pressable onPress={handleViewLocation} style={({ pressed }) => [
                  styles.locationBtn,
                  pressed && styles.locationBtnPressed,
                ]} accessibilityRole="button" accessibilityLabel="View location on map">
                  {({ pressed }) => (
                    <>
                      <MapPin size={18} color={pressed ? Colors.textOnPrimary : Colors.primary} />
                      <Text style={[styles.locationBtnText, pressed && styles.locationBtnTextPressed]}>
                        View Location
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={handleGetDirections} style={({ pressed }) => [
                  styles.locationBtn,
                  styles.locationBtnSecondary,
                  pressed && styles.locationBtnSecondaryPressed,
                ]} accessibilityRole="button" accessibilityLabel="Get directions to this property">
                  {({ pressed }) => (
                    <>
                      <Navigation size={18} color={pressed ? Colors.textOnPrimary : Colors.accent} />
                      <Text style={[styles.locationBtnText, pressed && styles.locationBtnTextPressed]}>
                        Get Directions
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <Text style={styles.locationUnavailable}>
                {[property.address, property.city, property.district].filter(Boolean).join(", ") || "Location not specified"}
              </Text>
            )}
          </Card>
        </View>

        {/* Manager Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Manager</Text>
          <Card padding="md">
            <View style={styles.contactRows}>
              {phone ? (
                <Pressable onPress={handleCall} accessibilityRole="button">
                  {({ pressed }) => (
                    <View style={[styles.contactBtn, pressed && styles.contactBtnPressed]}>
                      <Phone size={16} color={pressed ? Colors.textOnPrimary : Colors.primary} />
                      <Text style={[styles.contactBtnText, pressed && styles.contactBtnTextPressed]}>
                        {phone}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ) : (
                <View style={styles.contactUnavailable}>
                  <Phone size={16} color={Colors.textMuted} />
                  <Text style={styles.contactUnavailableText}>Phone not provided</Text>
                </View>
              )}
              {email ? (
                <Pressable onPress={handleEmail} accessibilityRole="button">
                  {({ pressed }) => (
                    <View style={[styles.contactBtn, pressed && styles.contactBtnPressed]}>
                      <Mail size={16} color={pressed ? Colors.textOnPrimary : Colors.primary} />
                      <Text style={[styles.contactBtnText, pressed && styles.contactBtnTextPressed]}>
                        {email}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ) : (
                <View style={styles.contactUnavailable}>
                  <Mail size={16} color={Colors.textMuted} />
                  <Text style={styles.contactUnavailableText}>Email not provided</Text>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Manager Actions */}
        {isManager && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Management</Text>
            <View style={styles.managerActions}>
              {/* Boost Status */}
              <Card padding="md">
                {property.is_boosted ? (
                  <View style={styles.boostStatusRow}>
                    <Star size={20} color={Colors.gold} fill={Colors.gold} />
                    <View style={styles.boostStatusText}>
                      <Text style={styles.boostStatusTitle}>Boosted</Text>
                      <Text style={styles.boostStatusSub}>
                        {property.boost_package_label ?? "Boosted"} — {property.boost_days_remaining ?? 0} day{(property.boost_days_remaining ?? 0) !== 1 ? "s" : ""} remaining
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Button
                    label="Boost Property"
                    onPress={() => router.push(`/boost-property?propertyId=${property.id}`)}
                    variant="outline"
                    leftIcon={<Sparkles size={18} color={Colors.gold} />}
                    fullWidth
                  />
                )}
              </Card>

              <Button label="Edit Property" onPress={() => router.push(`/edit-property?id=${property.id}`)} variant="outline" leftIcon={<Pencil size={18} color={Colors.primary} />} fullWidth />
              <Button
                label={property.occupancy_status === "occupied" ? "Mark Available" : "Mark Occupied"}
                onPress={handleToggleOccupancy}
                variant="outline"
                leftIcon={<Check size={18} color={property.occupancy_status === "occupied" ? Colors.success : Colors.warning} />}
                fullWidth
                loading={updateMutation.isPending}
              />
              <Button
                label={property.status === "active" ? "Deactivate" : "Activate"}
                onPress={handleToggleStatus}
                variant="outline"
                leftIcon={<Power size={18} color={Colors.warning} />}
                fullWidth
                loading={updateMutation.isPending}
              />
              <Button label="Delete Property" onPress={handleDelete} variant="danger" leftIcon={<Trash2 size={18} color={Colors.textOnPrimary} />} fullWidth loading={deleteMutation.isPending} />
            </View>
          </View>
        )}

        {/* Guest Actions */}
        {!isManager && (
          <View style={styles.guestActions}>
            <Button
              label="Send Inquiry"
              onPress={handleInquiry}
              fullWidth
              size="lg"
              tone="accent"
              leftIcon={<MessageCircle size={20} color={Colors.textOnPrimary} />}
            />
            <View style={styles.guestSecondary}>
              <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share property">
                {({ pressed }) => (
                  <View style={[styles.guestIconBtn, pressed && styles.guestIconBtnPressed]}>
                    <Share2 size={20} color={pressed ? Colors.textOnPrimary : Colors.primary} />
                  </View>
                )}
              </Pressable>
              <Pressable onPress={handleMessage} accessibilityRole="button" accessibilityLabel="Message on WhatsApp">
                {({ pressed }) => (
                  <View style={[styles.guestIconBtn, pressed && styles.guestIconBtnPressed]}>
                    <MessageCircle size={20} color={pressed ? Colors.textOnPrimary : "#25D366"} />
                  </View>
                )}
              </Pressable>
              <Pressable onPress={handleCall} accessibilityRole="button" accessibilityLabel="Call">
                {({ pressed }) => (
                  <View style={[styles.guestIconBtn, pressed && styles.guestIconBtnPressed]}>
                    <Phone size={20} color={pressed ? Colors.textOnPrimary : Colors.primary} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    position: "relative",
    height: 240,
    backgroundColor: Colors.primaryDeep,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: "rgba(255,255,255,0.5)",
  },
  imageBadges: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  imageDots: {
    position: "absolute",
    bottom: Spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  imageCounter: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  imageCounterText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  imageDotActive: {
    backgroundColor: Colors.textOnPrimary,
    width: 20,
    borderRadius: 4,
  },
  bookmarkBtn: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  titleSection: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    flex: 1,
  },
  price: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  pricePeriod: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  quickDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  quickDetailItem: {
    alignItems: "center",
    gap: 4,
  },
  quickDetailValue: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  quickDetailLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  description: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.pill,
  },
  amenityText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  contactRows: {
    gap: Spacing.sm,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  contactBtnPressed: {
    backgroundColor: Colors.primary,
  },
  contactBtnText: {
    fontSize: FontSize.body,
    color: Colors.primary,
  },
  contactBtnTextPressed: {
    color: Colors.textOnPrimary,
  },
  contactUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  contactUnavailableText: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  locationBtns: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  locationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.input,
    paddingVertical: Spacing.md,
  },
  locationBtnPressed: {
    backgroundColor: Colors.primary,
  },
  locationBtnSecondary: {
    backgroundColor: Colors.accentSoft,
  },
  locationBtnSecondaryPressed: {
    backgroundColor: Colors.accent,
  },
  locationBtnText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  locationBtnTextPressed: {
    color: Colors.textOnPrimary,
  },
  locationUnavailable: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    textAlign: "center",
  },
  managerActions: {
    gap: Spacing.sm,
  },
  boostStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  boostStatusText: {
    flex: 1,
  },
  boostStatusTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  boostStatusSub: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  guestActions: {
    gap: Spacing.md,
  },
  guestSecondary: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
  },
  guestIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  guestIconBtnPressed: {
    backgroundColor: Colors.primary,
  },
});
