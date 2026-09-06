import { useMemo, useState, useEffect } from "react";
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
import { LocationPicker } from "@/src/components/LocationPicker";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { useAuth } from "@/src/context/auth-context";
import { useProperty, useUpdateProperty } from "@/src/hooks/useProperties";
import { useCountries, useRegions } from "@/src/hooks/useGeoLocation";
import { usePropertyCategories, usePropertyTypes } from "@/src/hooks/usePropertyTypes";
import { ensureImagesUploaded, MAX_PROPERTY_IMAGES } from "@/src/services/properties";
import { ApiError } from "@/src/lib/api-client";
import { useToast } from "@/src/components/Toast";
import { COUNTRIES, currencyForCountry, currencyOptions } from "@/src/data/countries";
import type { Amenity } from "@/src/types";
import { formatAmenity } from "@/src/utils/format";

const ALL_AMENITIES: Amenity[] = [
  "water", "electricity", "parking", "security", "wifi",
  "garden", "balcony", "furnished", "borehole", "solar",
];

const DEFAULT_COUNTRY = "UG";

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: property, isLoading } = useProperty(id);
  const { subscription } = useAuth();
  const updateMutation = useUpdateProperty();
  const toast = useToast();
  const [errors, setErrors] = useState<Partial<Record<"title" | "rent" | "district" | "location", string>>>({});

  const [showGate, setShowGate] = useState(false);
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [regionId, setRegionId] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [rent, setRent] = useState("");
  const [currencyOverride, setCurrencyOverride] = useState<string | null>(null);
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [deposit, setDeposit] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const { data: countries = [] } = useCountries();
  const { data: regions = [] } = useRegions(country);
  const { data: categories = [] } = usePropertyCategories();
  const { data: types = [] } = usePropertyTypes(category || undefined);

  // Worldwide list bundled with the app; server-side countries missing
  // locally are appended so nothing the backend offers is lost.
  const countryOptions = useMemo(() => {
    const base = COUNTRIES.map((c) => ({ label: c.name, value: c.iso2 }));
    const known = new Set(COUNTRIES.map((c) => c.iso2));
    const extra = countries
      .filter((c) => !known.has(c.iso2))
      .map((c) => ({ label: c.name, value: c.iso2 }));
    return [...base, ...extra];
  }, [countries],
  );

  const regionOptions = useMemo(() =>
    regions.map((r) => ({ label: r.name, value: r.name })),
    [regions],
  );

  const categoryOptions = useMemo(() => [
    { label: "All Categories", value: "" },
    ...categories.map((c) => ({ label: c.label, value: c.slug })),
  ], [categories]);

  const typeOptions = useMemo(() =>
    types.map((t) => ({ label: t.label, value: t.slug })),
    [types],
  );

  const handleCategoryChange = (v: string) => {
    setCategory(v);
    setType("");
  };

  const currency = currencyOverride ?? currencyForCountry(country);

  useEffect(() => {
    if (!property) return;
    setTitle(property.title);
    setCountry(property.country || DEFAULT_COUNTRY);
    setRegionId(property.region_id || "");
    setDistrict(property.district);
    setCity(property.city);
    setAddress(property.address);
    setLocationCoords(property.lat && property.lng ? { lat: property.lat, lng: property.lng } : null);
    setType(property.type);
    const matchedType = types.find((t) => t.slug === property.type);
    setCategory(matchedType?.category_slug ?? "residential");
    setRent(String(property.rent_amount || ""));
    // Preserve whatever the listing was created with. Recomputing this from
    // the country on save silently reset any deliberate choice (e.g. a
    // Kampala property listed in USD) the first time the manager edited it.
    setCurrencyOverride(property.rent_currency || null);
    setBeds(String(property.beds || ""));
    setBaths(String(property.baths || ""));
    setSquareFeet(property.square_feet ? String(property.square_feet) : "");
    setDeposit(property.security_deposit ? String(property.security_deposit) : "");
    setDescription(property.description);
    setAmenities(property.amenities);
    setImages(property.images);
  }, [property, types]);

  const handleCountryChange = (iso: string) => {
    setCountry(iso);
    setRegionId("");
    setDistrict("");
  };

  const handleRegionSelect = (name: string) => {
    setDistrict(name);
    const match = regions.find((r) => r.name === name);
    setRegionId(match?.id ?? "");
  };

  const toggleAmenity = (a: Amenity) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const pickImages = async () => {
    const remaining = MAX_PROPERTY_IMAGES - images.length;
    if (remaining <= 0) {
      toast.show(`Photo limit reached. You can add up to ${MAX_PROPERTY_IMAGES} photos per property.`, "info");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.6,
    });
    if (!result.canceled) {
      const picked = result.assets.map((a) => a.uri);
      const accepted = picked.slice(0, remaining);
      if (picked.length > remaining) {
        toast.show(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} added. The limit is ${MAX_PROPERTY_IMAGES}.`, "info");
      }
      setImages((prev) => [...prev, ...accepted]);
    }
  };

  const replaceImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
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
    if (subscription?.status !== "active") {
      setShowGate(true);
      return;
    }
    const titleMsg = title.trim() ? undefined : "Give the property a title.";
    const rentN = Number(rent);
    const rentMsg = !rent.trim()
      ? "Enter the monthly rent."
      : !(rentN > 0)
        ? "Rent must be a number greater than 0."
        : undefined;
    const districtMsg = district.trim() ? undefined : "Select or type the district.";
    const locationMsg = locationCoords ? undefined : "Add the property location on the map.";
    setErrors({ title: titleMsg, rent: rentMsg, district: districtMsg, location: locationMsg });
    if (titleMsg || rentMsg || districtMsg || locationMsg) return;

    try {
      const upload = images.length > 0 ? await ensureImagesUploaded(images) : { urls: [], failed: [] };
      if (upload.failed.length > 0) {
        Alert.alert(
          "Some photos failed to upload",
          `${upload.failed.length} photo${upload.failed.length === 1 ? "" : "s"} could not be uploaded. Save with the ${upload.urls.length} that succeeded, or cancel and retry.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save Anyway", onPress: () => saveProperty(upload.urls) },
          ],
        );
        return;
      }
      await saveProperty(upload.urls);
    } catch (e) {
      toast.show(
        e instanceof ApiError ? e.message : "Something went wrong. Please try again.",
        "error",
      );
    }
  };

  const saveProperty = async (uploadedImages: string[]) => {
    try {
      const data: Record<string, unknown> = {
        title: title.trim(),
        country,
        region_id: regionId || null,
        state: district.trim(),
        city: city.trim(),
        address: address.trim(),
        property_type: category === "commercial" ? "Office Space" : "Residential",
        property_type_slug: type || null,
        monthly_rent: Number(rent),
        rent_currency: currency,
        bedrooms: Number(beds) || 1,
        bathrooms: Number(baths) || 1,
        sitting_rooms: 1,
        kitchens: 1,
        square_feet: squareFeet ? Number(squareFeet) : null,
        security_deposit: deposit ? Number(deposit) : 0,
        latitude: locationCoords?.lat ?? null,
        longitude: locationCoords?.lng ?? null,
        description: description.trim() || null,
        amenities: amenities.length > 0 ? amenities : null,
      };

      await updateMutation.mutateAsync({ id: id!, data: { ...data, images: uploadedImages } });
      toast.show("Property updated successfully.", "success");
      router.back();
    } catch (e) {
      toast.show(
        e instanceof ApiError ? e.message : "Could not update property. Please try again.",
        "error",
      );
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

        <InputField
          label="Title"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (errors.title && v.trim()) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
          placeholder="e.g. Sunrise Apartments"
        />
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="Country"
          value={country}
          options={countryOptions}
          onSelect={handleCountryChange}
          placeholder="Select country"
          searchable
        />
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="District / Region"
          value={district}
          options={regionOptions}
          onSelect={(v) => {
            handleRegionSelect(v);
            if (v.trim()) setErrors((prev) => ({ ...prev, district: undefined }));
          }}
          placeholder="Select or type district"
          searchable
          allowCustom
          error={errors.district}
        />
        <View style={{ height: Spacing.md }} />
        <InputField label="City/Area" value={city} onChangeText={setCity} placeholder="e.g. Kololo" />
        <View style={{ height: Spacing.md }} />
        <InputField label="Address" value={address} onChangeText={setAddress} placeholder="Plot number, street" />
        <View style={{ height: Spacing.md }} />

        <LocationPicker
          onLocationChange={(lat, lng) => {
            setLocationCoords(lat && lng ? { lat, lng } : null);
            if (lat && lng) setErrors((prev) => ({ ...prev, location: undefined }));
          }}
          initialLat={locationCoords?.lat}
          initialLng={locationCoords?.lng}
          error={errors.location ?? ""}
        />
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="Property Category"
          value={category}
          options={categoryOptions}
          onSelect={handleCategoryChange}
          placeholder="Select category"
        />
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="Property Type"
          value={type}
          options={typeOptions}
          onSelect={setType}
          placeholder="Select type"
        />
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="Currency"
          value={currency}
          options={currencyOptions(country)}
          onSelect={setCurrencyOverride}
          placeholder="Select currency"
        />
        <View style={{ height: Spacing.md }} />
        <InputField
          label={`Rent per Month (${currency})`}
          value={rent}
          onChangeText={(v) => {
            setRent(v);
            if (errors.rent && Number(v) > 0) setErrors((prev) => ({ ...prev, rent: undefined }));
          }}
          error={errors.rent}
          placeholder="0"
          keyboardType="numeric"
        />

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
        <Text style={styles.limitNotice}>
          {`You can add up to ${MAX_PROPERTY_IMAGES} photos. ${images.length} of ${MAX_PROPERTY_IMAGES} added.`}
        </Text>
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
        <Button
          label={images.length > 0 ? "Add More Images" : "Pick Images"}
          onPress={pickImages}
          variant="outline"
          fullWidth
          disabled={images.length >= MAX_PROPERTY_IMAGES}
        />

        <View style={{ height: Spacing.xl }} />
        <Button label="Save Changes" onPress={handleSave} fullWidth size="lg" loading={updateMutation.isPending} />
      </View>
      <View style={{ height: 100 }} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="updating properties"
        onClose={() => setShowGate(false)}
        onRenew={() => {
          setShowGate(false);
          router.push("/subscription");
        }}
      />
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
    backgroundColor: Colors.surfaceAlt,
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
  limitNotice: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
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
    backgroundColor: Colors.surfaceAlt,
  },
  imageActionDanger: {
    backgroundColor: Colors.surfaceAlt,
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
