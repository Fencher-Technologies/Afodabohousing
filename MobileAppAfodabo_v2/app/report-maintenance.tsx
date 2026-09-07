/**
 * Report a maintenance issue.
 *
 * The property is taken from the tenant's active tenancy rather than asked
 * for: a tenant only ever raises requests against the home they rent, and the
 * API rejects anything else. Status is always "open" on creation — scheduling
 * and completion are the manager's to set.
 */

import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { Colors, FontSize, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { InputField } from "@/src/components/InputField";
import { LoadingState } from "@/src/components/LoadingState";
import { PageHeader } from "@/src/components/PageHeader";
import { SelectField } from "@/src/components/SelectField";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { useCreateMaintenanceRequest } from "@/src/hooks/useMaintenance";
import { ensureImagesUploaded } from "@/src/services/properties";
import { useTenancyList } from "@/src/hooks/useTenancies";
import type { MaintenancePriority } from "@/src/services/maintenance";

const PRIORITIES: { label: string; value: MaintenancePriority }[] = [
  { label: "Low — can wait", value: "low" },
  { label: "Medium — needs attention", value: "medium" },
  { label: "High — affecting daily use", value: "high" },
  { label: "Urgent — unsafe or unusable", value: "urgent" },
];

export default function ReportMaintenanceScreen() {
  const toast = useToast();
  const createRequest = useCreateMaintenanceRequest();
  const { data: tenanciesData, isLoading } = useTenancyList();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("medium");
  // The web tenant form has always allowed a photo; a picture of the problem
  // is the most useful thing a manager can receive.
  const [photo, setPhoto] = useState<string | null>(null);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhoto(result.assets[0].uri);
    }
  }

  const activeLease = useMemo(() => {
    const items = tenanciesData?.items ?? [];
    return items.find((l) => l.effective_status === "active" || l.status === "active");
  }, [tenanciesData]);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.show("Give the issue a short title.", "error");
      return;
    }
    if (!description.trim()) {
      toast.show("Describe the problem so your manager knows what to expect.", "error");
      return;
    }
    if (!activeLease?.property_id) return;

    try {
      let photoUrl: string | null = null;
      if (photo) {
        const uploaded = await ensureImagesUploaded([photo]);
        photoUrl = uploaded.urls?.[0] ?? null;
      }
      await createRequest.mutateAsync({
        property_id: activeLease.property_id,
        tenant_id: activeLease.tenant_id ?? null,
        title: title.trim(),
        description: description.trim(),
        priority,
        photo_url: photoUrl,
      });
      toast.show("Request sent to your property manager.", "success");
      router.back();
    } catch {
      toast.show("Could not send the request. Please try again.", "error");
    }
  }

  if (isLoading) return <LoadingState message="Loading your tenancy…" />;

  if (!activeLease) {
    return (
      <View style={styles.container}>
        <PageHeader title="Report an Issue" onBack={() => router.back()} />
        <EmptyState
          icon={<Text style={styles.emptyIcon}>🔧</Text>}
          title="No active tenancy"
          description="Maintenance requests are raised against the home you rent. Once your tenancy is active you can report issues here."
        />
      </View>
    );
  }

  return (
    <Screen scroll>
      <PageHeader title="Report an Issue" onBack={() => router.back()} />
      <View style={styles.content}>
        <Card padding="lg" style={styles.card}>
          <Text style={styles.property}>{activeLease.property_title}</Text>
          <Text style={styles.help}>
            Your manager will be notified and you will see the status here as it
            is scheduled and completed.
          </Text>
        </Card>

        <InputField
          label="What is the problem?"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Kitchen tap is leaking"
        />
        <View style={{ height: Spacing.md }} />
        <InputField
          label="Describe it"
          value={description}
          onChangeText={setDescription}
          placeholder="Where it is, when it started, anything that helps"
          multiline
          numberOfLines={5}
        />
        <View style={{ height: Spacing.md }} />
        <SelectField
          label="How urgent is it?"
          value={priority}
          options={PRIORITIES}
          onSelect={(v) => setPriority(v as MaintenancePriority)}
          placeholder="Select priority"
        />

        <View style={{ height: Spacing.md }} />
        {photo ? (
          <Pressable onPress={pickPhoto}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <Text style={styles.photoHint}>Tap to change photo</Text>
          </Pressable>
        ) : (
          <Button label="Add a photo (optional)" variant="outline" onPress={pickPhoto} fullWidth />
        )}

        <View style={{ height: Spacing.xl }} />
        <Button
          label="Send to manager"
          onPress={handleSubmit}
          loading={createRequest.isPending}
          fullWidth
          size="lg"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  card: { gap: Spacing.xs, marginBottom: Spacing.lg },
  property: { fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: "600" },
  help: { fontSize: FontSize.caption, color: Colors.textSecondary },
  emptyIcon: { fontSize: 40 },
  photo: { width: "100%", height: 180, borderRadius: 12, backgroundColor: Colors.surfaceAlt },
  photoHint: { fontSize: FontSize.caption, color: Colors.textMuted, textAlign: "center", marginTop: 4 },
});
