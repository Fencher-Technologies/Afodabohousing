import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Building2,
  MapPin,
  AlignLeft,
  Grid3X3,
  ImagePlus,
  Home,
  DollarSign,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { Card } from "@/src/components/Card";
import { PageHeader } from "@/src/components/PageHeader";
import { FormSteps } from "@/src/components/FormSteps";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { LocationPicker } from "@/src/components/LocationPicker";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/auth-context";
import { useCreateProperty } from "@/src/hooks/useProperties";
import { useCountries, useRegions } from "@/src/hooks/useGeoLocation";
import { usePropertyCategories, usePropertyTypes } from "@/src/hooks/usePropertyTypes";
import { ensureImagesUploaded, MAX_PROPERTY_IMAGES } from "@/src/services/properties";
import { ApiError } from "@/src/lib/api-client";
import { COUNTRIES, currencyForCountry } from "@/src/data/countries";
import type { Amenity } from "@/src/types";
import { formatAmenity } from "@/src/utils/format";

const ALL_AMENITIES: Amenity[] = [
  "water", "electricity", "parking", "security", "wifi",
  "garden", "balcony", "furnished", "borehole", "solar",
];

const DEFAULT_COUNTRY = "UG";
const MAX_IMAGES = MAX_PROPERTY_IMAGES;
const STEPS = ["Details", "Location", "Photos & Info"];

type FieldKey = "title" | "rent" | "district" | "location";
type FieldErrors = Partial<Record<FieldKey, string>>;

export default function CreatePropertyScreen() {
  const { subscription } = useAuth();
  const createMutation = useCreateProperty();
  const toast = useToast();
  const [showGate, setShowGate] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
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

  const currency = currencyForCountry(country);

  // Worldwide list bundled with the app; any server-side countries that are
  // missing locally are appended so nothing the backend offers is lost.
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

  const handleCountryChange = (iso: string) => {
    setCountry(iso);
    setRegionId("");
    setDistrict("");
  };

  const handleRegionSelect = (name: string) => {
    setDistrict(name);
    const match = regions.find((r) => r.name === name);
    setRegionId(match?.id ?? "");
    if (name.trim()) setErrors((prev) => ({ ...prev, district: undefined }));
  };

  const isExpired = subscription?.status !== "active";

  const toggleAmenity = (a: Amenity) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const setFieldError = (key: FieldKey, message?: string) =>
    setErrors((prev) => ({ ...prev, [key]: message }));

  const validateTitle = () => {
    const msg = title.trim() ? undefined : "Give the property a title.";
    setFieldError("title", msg);
    return !msg;
  };

  const validateRent = () => {
    const n = Number(rent);
    const msg = !rent.trim()
      ? "Enter the monthly rent."
      : !(n > 0)
        ? "Rent must be a number greater than 0."
        : undefined;
    setFieldError("rent", msg);
    return !msg;
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      const okTitle = validateTitle();
      const okRent = validateRent();
      return okTitle && okRent;
    }
    if (s === 1) {
      const districtMsg = district.trim() ? undefined : "Select or type the district.";
      const locationMsg = locationCoords ? undefined : "Add the property location on the map.";
      setErrors((prev) => ({ ...prev, district: districtMsg, location: locationMsg }));
      return !districtMsg && !locationMsg;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.show(`Photo limit reached. You can add up to ${MAX_IMAGES} photos per property.`, "info");
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
        toast.show(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} added. The limit is ${MAX_IMAGES}.`, "info");
      }
      setImages((prev) => [...prev, ...accepted]);
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((u) => u !== uri));
  };

  const handleSubmit = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    // Re-run every step's rules; jump back to the first failing step.
    if (!validateStep(0)) {
      setStep(0);
      return;
    }
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    try {
      const upload = images.length > 0 ? await ensureImagesUploaded(images) : { urls: [], failed: [] };
      if (upload.failed.length > 0) {
        // A decision is required, so this one stays a blocking dialog.
        Alert.alert(
          "Some photos failed to upload",
          `${upload.failed.length} photo${upload.failed.length === 1 ? "" : "s"} could not be uploaded. Save the property with the ${upload.urls.length} that succeeded, or cancel and retry.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save Anyway", onPress: () => submitProperty(upload.urls) },
          ],
        );
        return;
      }
      await submitProperty(upload.urls);
    } catch (e) {
      toast.show(
        e instanceof ApiError ? e.message : "Something went wrong. Please try again.",
        "error",
      );
    }
  };

  const submitProperty = async (uploadedImages: string[]) => {
    try {
      const payload: Record<string, unknown> = {
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

      await createMutation.mutateAsync({ ...payload, images: uploadedImages.length > 0 ? uploadedImages : null });
      toast.show("Property listed successfully.", "success");
      router.back();
    } catch (e) {
      toast.show(
        e instanceof ApiError ? e.message : "Could not list property. Please try again.",
        "error",
      );
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="List New Property" onBack={() => router.back()} />
      <FormSteps steps={STEPS} current={step} />

      <View style={styles.content}>
        {step === 0 && (
          <>
            <Card padding="md">
              <View style={styles.sectionHeader}>
                <Home size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Property Details</Text>
              </View>
              <View style={{ height: Spacing.md }} />
              <InputField
                label="Title"
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  if (errors.title && v.trim()) setFieldError("title");
                }}
                onBlur={validateTitle}
                error={errors.title}
                placeholder="e.g. Sunrise Apartments"
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
            </Card>

            <View style={{ height: Spacing.md }} />

            <Card padding="md">
              <View style={styles.sectionHeader}>
                <DollarSign size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Pricing</Text>
              </View>
              <View style={{ height: Spacing.md }} />
              <InputField
                label={`Rent per Month (${currency})`}
                value={rent}
                onChangeText={(v) => {
                  setRent(v);
                  if (errors.rent && Number(v) > 0) setFieldError("rent");
                }}
                onBlur={validateRent}
                error={errors.rent}
                placeholder="0"
                keyboardType="numeric"
              />
              <View style={{ height: Spacing.md }} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField label={`Deposit (${currency})`} value={deposit} onChangeText={setDeposit} placeholder="0" keyboardType="numeric" />
                </View>
                <View style={{ width: Spacing.md }} />
                <View style={{ flex: 1 }}>
                  <InputField label="Sq Ft" value={squareFeet} onChangeText={setSquareFeet} placeholder="0" keyboardType="numeric" />
                </View>
              </View>
            </Card>

            <View style={{ height: Spacing.md }} />

            <Card padding="md">
              <View style={styles.sectionHeader}>
                <Building2 size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Unit Details</Text>
              </View>
              <View style={{ height: Spacing.md }} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField label="Bedrooms" value={beds} onChangeText={setBeds} placeholder="0" keyboardType="numeric" />
                </View>
                <View style={{ width: Spacing.md }} />
                <View style={{ flex: 1 }}>
                  <InputField label="Bathrooms" value={baths} onChangeText={setBaths} placeholder="0" keyboardType="numeric" />
                </View>
              </View>
            </Card>
          </>
        )}

        {step === 1 && (
          <>
            <Card padding="md">
              <View style={styles.sectionHeader}>
                <MapPin size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Where Is It?</Text>
              </View>
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
                onSelect={handleRegionSelect}
                placeholder="Select or type district"
                searchable
                allowCustom
                error={errors.district}
              />
              <View style={{ height: Spacing.md }} />
              <InputField label="City/Area" value={city} onChangeText={setCity} placeholder="e.g. Kololo" />
              <View style={{ height: Spacing.md }} />
              <InputField label="Address" value={address} onChangeText={setAddress} placeholder="Plot number, street" />
            </Card>

            <View style={{ height: Spacing.md }} />

            <Card padding="md">
              <View style={styles.sectionHeader}>
                <MapPin size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Exact Property Location</Text>
              </View>
              <View style={{ height: Spacing.md }} />
              <LocationPicker
                onLocationChange={(lat, lng) => {
                  setLocationCoords(lat && lng ? { lat, lng } : null);
                  if (lat && lng) setFieldError("location");
                }}
                error={errors.location ?? ""}
              />
            </Card>
          </>
        )}

        {step === 2 && (
          <>
            <Card padding="md">
              <View style={styles.sectionHeader}>
                <ImagePlus size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Images</Text>
              </View>
              <Text style={styles.limitNotice}>
                {`You can add up to ${MAX_IMAGES} photos. ${images.length} of ${MAX_IMAGES} added.`}
              </Text>
              <View style={{ height: Spacing.sm }} />
              {images.length > 0 && (
                <View style={styles.imageList}>
                  {images.map((uri, i) => (
                    <View key={`${uri}-${i}`} style={styles.imageItem}>
                      <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                      <Button
                        label="Remove"
                        onPress={() => removeImage(uri)}
                        variant="ghost"
                        tone="danger"
                        size="sm"
                      />
                    </View>
                  ))}
                </View>
              )}
              <Button
                label={images.length > 0 ? "Add More Images" : "Pick Images"}
                onPress={pickImages}
                variant="outline"
                fullWidth
                disabled={images.length >= MAX_IMAGES}
              />
            </Card>

            <View style={{ height: Spacing.md }} />

            <Card padding="md">
              <View style={styles.sectionHeader}>
                <Grid3X3 size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Amenities</Text>
              </View>
              <View style={{ height: Spacing.md }} />
              <View style={styles.amenitiesGrid}>
                {ALL_AMENITIES.map((a) => {
                  const selected = amenities.includes(a);
                  return (
                    <View key={a}>
                      <Button
                        label={formatAmenity(a)}
                        onPress={() => toggleAmenity(a)}
                        variant={selected ? "solid" : "outline"}
                        tone={selected ? "accent" : "primary"}
                        size="sm"
                      />
                    </View>
                  );
                })}
              </View>
            </Card>

            <View style={{ height: Spacing.md }} />

            <Card padding="md">
              <View style={styles.sectionHeader}>
                <AlignLeft size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <View style={{ height: Spacing.md }} />
              <InputField
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the property, location benefits, nearby landmarks…"
                multiline
                numberOfLines={4}
              />
            </Card>
          </>
        )}

        <View style={{ height: Spacing.xl }} />
        <View style={styles.navRow}>
          {step > 0 && (
            <Button label="Back" onPress={goBack} variant="outline" flex />
          )}
          {step < STEPS.length - 1 ? (
            <Button label="Continue" onPress={goNext} fullWidth={step === 0} flex={step > 0} size="lg" />
          ) : (
            <Button label="List Property" onPress={handleSubmit} flex size="lg" loading={createMutation.isPending} />
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="listing new properties"
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
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: "row",
  },
  navRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  limitNotice: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  imageList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  imageItem: {
    gap: Spacing.sm,
  },
  imagePreview: {
    width: 160,
    height: 120,
    borderRadius: Radii.input,
    backgroundColor: Colors.surfaceAlt,
  },
});
