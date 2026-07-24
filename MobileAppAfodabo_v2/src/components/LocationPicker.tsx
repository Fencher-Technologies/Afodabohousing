import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { MapPin, Crosshair, Link2, CheckCircle2, X, ChevronRight } from "lucide-react-native";
import * as Location from "expo-location";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";

interface LocationPickerProps {
  onLocationChange: (lat: number | null, lng: number | null) => void;
  initialLat?: number;
  initialLng?: number;
  error?: string;
}

type FlowStep = "menu" | "gps" | "link";

function parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@?(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  return null;
}

async function resolveMapLink(url: string): Promise<string> {
  if (!url.includes("goo.gl") && !url.includes("maps.app.goo")) return url;
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow" });
    return response.url;
  } catch {
    return url;
  }
}

export function LocationPicker({ onLocationChange, initialLat, initialLng, error }: LocationPickerProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("menu");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [parsedCoords, setParsedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [parsedAddress, setParsedAddress] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");

  const saveCoords = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    onLocationChange(lat, lng);
    resetModal();
  };

  const removeLocation = () => {
    setCoords(null);
    onLocationChange(null, null);
  };

  const resetModal = () => {
    setModalVisible(false);
    setFlowStep("menu");
    setGpsCoords(null);
    setGpsAddress(null);
    setGpsLoading(false);
    setLinkInput("");
    setParsedCoords(null);
    setParsedAddress(null);
    setLinkError("");
  };

  const handleUseGps = async () => {
    setFlowStep("gps");
    setGpsLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is needed to use this feature."
        );
        setFlowStep("menu");
        setGpsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const { latitude, longitude } = loc.coords;
      setGpsCoords({ lat: latitude, lng: longitude });

      try {
        const addr = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addr.length > 0) {
          const a = addr[0];
          const parts = [a.street, a.name, a.district, a.city, a.region, a.country].filter(Boolean);
          setGpsAddress(parts.join(", ") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } else {
          setGpsAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch {
        setGpsAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch {
      Alert.alert("Error", "Could not get your current location. Please try again.");
      setFlowStep("menu");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleParseLink = async () => {
    setLinkError("");

    let url = linkInput.trim();
    if (url.includes("goo.gl") || url.includes("maps.app.goo")) {
      try {
        url = await resolveMapLink(url);
      } catch {
        setLinkError("Could not open that link. Make sure you copied a Google Maps link.");
        return;
      }
    }

    const result = parseGoogleMapsLink(url);
    if (!result) {
      setLinkError(
        "Could not find coordinates in that link. Please share a Google Maps link that includes a location pin."
      );
      return;
    }

    setParsedCoords(result);

    try {
      const addr = await Location.reverseGeocodeAsync({
        latitude: result.lat,
        longitude: result.lng,
      });
      if (addr.length > 0) {
        const a = addr[0];
        const parts = [a.street, a.name, a.district, a.city, a.region, a.country].filter(Boolean);
        setParsedAddress(parts.join(", ") || `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
      } else {
        setParsedAddress(`${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
      }
    } catch {
      setParsedAddress(`${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
    }
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Exact Property Location</Text>

      {coords ? (
        <Card padding="md">
          <View style={styles.locationAddedCard}>
            <View style={styles.locationAddedHeader}>
              <CheckCircle2 size={20} color={Colors.success} />
              <Text style={styles.locationAddedText}>Property location added</Text>
            </View>
            <Text style={styles.coordsText}>
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </Text>
            <View style={styles.locationActions}>
              <Pressable onPress={() => setModalVisible(true)} style={styles.changeLocationBtn}>
                <Text style={styles.changeLocationText}>Change Location</Text>
              </Pressable>
              <Pressable onPress={removeLocation} style={styles.removeLocationBtn}>
                <Text style={styles.removeLocationText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      ) : (
        <Pressable onPress={() => setModalVisible(true)} style={styles.addLocationBtn}>
          <MapPin size={20} color={Colors.primary} />
          <Text style={styles.addLocationText}>Add Location</Text>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={resetModal} style={styles.modalCloseBtn} accessibilityLabel="Close">
              <X size={24} color={Colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {flowStep === "menu" && "Select Location Method"}
              {flowStep === "gps" && "Current Location"}
              {flowStep === "link" && "Google Maps Link"}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {flowStep === "menu" && (
            <View style={styles.menuContent}>
              <Pressable style={styles.optionCard} onPress={handleUseGps}>
                <View style={[styles.optionIconWrap, { backgroundColor: Colors.primarySoft }]}>
                  <Crosshair size={24} color={Colors.primary} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Use Current Location</Text>
                  <Text style={styles.optionDesc}>Use GPS to pinpoint the property right where you are</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </Pressable>

              <Pressable style={styles.optionCard} onPress={() => { setFlowStep("link"); setLinkInput(""); setParsedCoords(null); setParsedAddress(null); setLinkError(""); }}>
                <View style={[styles.optionIconWrap, { backgroundColor: Colors.accentSoft }]}>
                  <Link2 size={24} color={Colors.accent} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Paste Google Maps Link</Text>
                  <Text style={styles.optionDesc}>Paste a shared Google Maps link with the property location</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </Pressable>
            </View>
          )}

          {flowStep === "gps" && (
            <View style={styles.flowContent}>
              {gpsLoading ? (
                <View style={styles.centerContent}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.statusText}>Getting your current location…</Text>
                </View>
              ) : gpsCoords ? (
                <View style={styles.confirmContent}>
                  <View style={styles.confirmIconWrap}>
                    <MapPin size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.confirmTitle}>Location Found</Text>
                  {gpsAddress ? <Text style={styles.confirmAddress}>{gpsAddress}</Text> : null}
                  <Text style={styles.coordsDetail}>
                    {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                  </Text>
                  <View style={styles.confirmActions}>
                    <Button label="Cancel" onPress={() => setFlowStep("menu")} variant="outline" flex />
                    <View style={{ width: Spacing.md }} />
                    <Button label="Use This Location" onPress={() => saveCoords(gpsCoords.lat, gpsCoords.lng)} variant="solid" flex />
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {flowStep === "link" && (
            <View style={styles.flowContent}>
              {!parsedCoords ? (
                <View style={styles.linkInputWrap}>
                  <Text style={styles.linkHint}>
                    Paste a Google Maps link containing coordinates
                  </Text>
                  <View style={styles.linkInputRow}>
                    <Link2 size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.linkInput}
                      placeholder="https://maps.google.com/…"
                      placeholderTextColor={Colors.textMuted}
                      value={linkInput}
                      onChangeText={(t) => { setLinkInput(t); setLinkError(""); }}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {linkError ? <Text style={styles.linkErrorText}>{linkError}</Text> : null}
                  <Button
                    label="Find Location"
                    onPress={handleParseLink}
                    variant="solid"
                    fullWidth
                    disabled={!linkInput.trim()}
                  />
                </View>
              ) : (
                <View style={styles.confirmContent}>
                  <View style={styles.confirmIconWrap}>
                    <MapPin size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.confirmTitle}>Confirm Location</Text>
                  {parsedAddress ? <Text style={styles.confirmAddress}>{parsedAddress}</Text> : null}
                  <Text style={styles.coordsDetail}>
                    {parsedCoords.lat.toFixed(6)}, {parsedCoords.lng.toFixed(6)}
                  </Text>
                  <View style={styles.confirmActions}>
                    <Button label="Back" onPress={() => { setParsedCoords(null); setParsedAddress(null); setLinkError(""); }} variant="outline" flex />
                    <View style={{ width: Spacing.md }} />
                    <Button label="Use This Location" onPress={() => saveCoords(parsedCoords.lat, parsedCoords.lng)} variant="solid" flex />
                  </View>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    backgroundColor: Colors.primarySoft,
  },
  addLocationText: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  errorText: {
    fontSize: FontSize.caption,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  locationAddedCard: {
    gap: Spacing.sm,
  },
  locationAddedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  locationAddedText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  coordsText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  locationActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  changeLocationBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.input,
    backgroundColor: Colors.primarySoft,
  },
  changeLocationText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  removeLocationBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.input,
    backgroundColor: Colors.dangerSoft,
  },
  removeLocationText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.danger,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === "ios" ? 56 : Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  menuContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.card,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  optionDesc: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  flowContent: {
    flex: 1,
    padding: Spacing.md,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  statusText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  confirmContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  confirmIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  confirmTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  confirmAddress: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  coordsDetail: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  confirmActions: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    width: "100%",
  },
  linkInputWrap: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  linkHint: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  linkInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.input,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkInput: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    padding: 0,
  },
  linkErrorText: {
    fontSize: FontSize.caption,
    color: Colors.danger,
    textAlign: "center",
  },
});
