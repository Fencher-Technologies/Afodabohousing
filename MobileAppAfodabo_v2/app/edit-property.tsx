import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Alert, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { PageHeader } from "@/src/components/PageHeader";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingState } from "@/src/components/LoadingState";
import { useProperty, useUpdateProperty } from "@/src/hooks/useProperties";
import { ensureImagesUploaded } from "@/src/services/properties";
import type { Amenity } from "@/src/types";
import { formatAmenity } from "@/src/utils/format";

const ALL_AMENITIES: Amenity[] = [
  "water", "electricity", "parking", "security", "wifi",
  "garden", "balcony", "furnished", "borehole", "solar",
];

const PROPERTY_TYPES = [
  { label: "Apartment", value: "apartment" },
  { label: "House", value: "house" },
  { label: "Studio", value: "studio" },
  { label: "Shop", value: "shop" },
  { label: "Single Room", value: "single_room" },
];

const DISTRICTS = [
  "Kampala", "Wakiso", "Mukono", "Entebbe", "Jinja", "Mbarara",
];

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: property, isLoading } = useProperty(id);
  const updateMutation = useUpdateProperty();

  const [title, setTitle] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [type, setType] = useState("");
  const [rent, setRent] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [deposit, setDeposit] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!property) return;
    setTitle(property.title);
    setDistrict(property.district);
    setCity(property.city);
    setAddress(property.address);
    setLatitude(property.lat ? String(property.lat) : "");
    setLongitude(property.lng ? String(property.lng) : "");
    setType(property.type);
    setRent(String(property.rent_amount || ""));
    setBeds(String(property.beds || ""));
    setBaths(String(property.baths || ""));
    setSquareFeet(property.square_feet ? String(property.square_feet) : "");
    setDeposit(property.security_deposit ? String(property.security_deposit) : "");
    setDescription(property.description);
    setAmenities(property.amenities);
    setImages(property.images);
  }, [property]);

  const toggleAmenity = (a: Amenity) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris]);
    }
  };

  const replaceImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => {
        const next = [...prev];
        next[index] = result.assets[0].uri;
        return next;
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !district.trim() || !rent.trim()) {
      Alert.alert("Missing fields", "Title, district, and rent are required.");
      return;
    }

    try {
      const uploadedImages = images.length > 0 ? await ensureImagesUploaded(images) : null;

      const data: Record<string, unknown> = {
        title: title.trim(),
        state: district.trim(),
        city: city.trim(),
        address: address.trim(),
        property_type: type || "apartment",
        monthly_rent: Number(rent),
        bedrooms: Number(beds) || 0,
        bathrooms: Number(baths) || 0,
        square_feet: squareFeet ? Number(squareFeet) : null,
        security_deposit: deposit ? Number(deposit) : null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        description: description.trim() || null,
        amenities: amenities.length > 0 ? amenities : null,
        images: uploadedImages,
      };

      await updateMutation.mutateAsync({ id: id!, data });
      Alert.alert("Saved", "Property updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Could not update property. Please try again.");
    }
  };

  if (isLoading) return <LoadingState message="Loading property…" />;
  if (!property) {
    return (
      <Screen scroll>
        <PageHeader title="Edit Property" onBack={() => router.back()} />
        <ErrorState title="Property not found" onRetry={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader title="Edit Property" onBack={() => router.back()} />

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Property Details</Text>

        <InputField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Sunrise Apartments" />
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="District"
          value={district}
          options={DISTRICTS.map((d) => ({ label: d, value: d }))}
          onSelect={setDistrict}
          placeholder="Select district"
        />
        <View style={{ height: Spacing.md }} />
        <InputField label="City/Area" value={city} onChangeText={setCity} placeholder="e.g. Kololo" />
        <View style={{ height: Spacing.md }} />
        <InputField label="Address" value={address} onChangeText={setAddress} placeholder="Plot number, street" />
        <View style={{ height: Spacing.md }} />
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            <InputField label="Latitude" value={latitude} onChangeText={setLatitude} placeholder="e.g. 0.3136" keyboardType="numeric" />
          </View>
          <View style={{ width: Spacing.md }} />
          <View style={{ flex: 1 }}>
            <InputField label="Longitude" value={longitude} onChangeText={setLongitude} placeholder="e.g. 32.5811" keyboardType="numeric" />
          </View>
        </View>
        <Text style={{ fontSize: 12, color: Colors.textMuted, fontStyle: "italic", marginTop: -8 }}>Coordinates so tenants can find the property on a map.</Text>
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="Property Type"
          value={type}
          options={PROPERTY_TYPES}
          onSelect={setType}
          placeholder="Select type"
        />
        <View style={{ height: Spacing.md }} />
        <InputField label="Rent (UGX)" value={rent} onChangeText={setRent} placeholder="0" keyboardType="numeric" />

        <View style={{ height: Spacing.lg }} />
        <Text style={styles.sectionLabel}>Unit Details</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField label="Bedrooms" value={beds} onChangeText={setBeds} placeholder="0" keyboardType="numeric" />
          </View>
          <View style={{ width: Spacing.md }} />
          <View style={{ flex: 1 }}>
            <InputField label="Bathrooms" value={baths} onChangeText={setBaths} placeholder="0" keyboardType="numeric" />
          </View>
        </View>
        <View style={{ height: Spacing.md }} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField label="Sq Ft" value={squareFeet} onChangeText={setSquareFeet} placeholder="0" keyboardType="numeric" />
          </View>
          <View style={{ width: Spacing.md }} />
          <View style={{ flex: 1 }}>
            <InputField label="Deposit (UGX)" value={deposit} onChangeText={setDeposit} placeholder="0" keyboardType="numeric" />
          </View>
        </View>

        <View style={{ height: Spacing.lg }} />
        <Text style={styles.sectionLabel}>Description</Text>
        <InputField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the property, location benefits, etc."
          multiline
          numberOfLines={4}
        />

        <View style={{ height: Spacing.lg }} />
        <Text style={styles.sectionLabel}>Amenities</Text>
        <View style={styles.amenitiesGrid}>
          {ALL_AMENITIES.map((a) => {
            const selected = amenities.includes(a);
            return (
              <Pressable
                key={a}
                onPress={() => toggleAmenity(a)}
                style={[styles.amenityChip, selected && styles.amenityChipSelected]}
              >
                <Text style={[styles.amenityChipText, selected && styles.amenityChipTextSelected]}>
                  {formatAmenity(a)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: Spacing.lg }} />
        <Text style={styles.sectionLabel}>Images</Text>
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
            {images.map((uri, i) => (
              <View key={`${uri}-${i}`} style={styles.imageItem}>
                <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                <View style={styles.imageActions}>
                  <Pressable onPress={() => replaceImage(i)} style={styles.imageActionBtn}>
                    <Text style={styles.imageActionText}>Replace</Text>
                  </Pressable>
                  <Pressable onPress={() => removeImage(i)} style={[styles.imageActionBtn, styles.imageActionDanger]}>
                    <Text style={[styles.imageActionText, styles.imageActionDangerText]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        <Button label={images.length > 0 ? "Add More Images" : "Pick Images"} onPress={pickImages} variant="outline" fullWidth />

        <View style={{ height: Spacing.xl }} />
        <Button label="Save Changes" onPress={handleSave} fullWidth size="lg" loading={updateMutation.isPending} />
      </View>
      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: "row",
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  amenityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
  },
  amenityChipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  amenityChipText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  amenityChipTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  imageList: {
    marginBottom: Spacing.sm,
  },
  imageItem: {
    marginRight: Spacing.sm,
    gap: Spacing.sm,
  },
  imagePreview: {
    width: 160,
    height: 120,
    borderRadius: Radii.input,
    backgroundColor: Colors.surfaceAlt,
  },
  imageActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  imageActionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xs,
    borderRadius: Radii.input,
    backgroundColor: Colors.primarySoft,
  },
  imageActionDanger: {
    backgroundColor: Colors.dangerSoft,
  },
  imageActionText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  imageActionDangerText: {
    color: Colors.danger,
  },
});
