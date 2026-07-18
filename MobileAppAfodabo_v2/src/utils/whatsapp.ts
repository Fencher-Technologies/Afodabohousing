/**
 * WhatsApp deep link builder + message templates.
 */

import { Linking, Alert, Platform } from "react-native";
import { formatUGX, formatDate } from "./format";

export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  const international = clean.startsWith("256") ? clean : clean.startsWith("0") ? "256" + clean.slice(1) : clean;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string): void {
  const url = buildWhatsAppUrl(phone, message);
  Linking.canOpenURL(url).then((can) => {
    if (can) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        "WhatsApp not found",
        "WhatsApp is not installed on this device.",
        Platform.OS === "ios"
          ? [{ text: "OK" }, { text: "Install", onPress: () => Linking.openURL("https://apps.apple.com/app/whatsapp-messenger/id310633997") }]
          : [{ text: "OK" }, { text: "Install", onPress: () => Linking.openURL("https://play.google.com/store/apps/details?id=com.whatsapp") }]
      );
    }
  });
}

export const MessageTemplates = {
  reminder: (tenantName: string, propertyTitle: string, amount: number, dueDate: string) =>
    `Hello ${tenantName}, this is a friendly reminder from your manager at ${propertyTitle}. Rent of ${formatUGX(amount)} was due on ${formatDate(dueDate)}. Please arrange payment. Thank you!`,

  confirmation: (tenantName: string, amount: number, propertyTitle: string, balance: number) =>
    `Hello ${tenantName}, your payment of ${formatUGX(amount)} for ${propertyTitle} has been confirmed. New balance: ${formatUGX(balance)}. Thank you!`,

  welcome: (tenantName: string, propertyTitle: string, rent: number, period: string, managerName: string) =>
    `Welcome to ${propertyTitle}, ${tenantName}! Your tenancy is now active. Rent: ${formatUGX(rent)}/${period}. Your manager is ${managerName}. Welcome home!`,

  receipt: (propertyTitle: string, tenantName: string, amount: number, date: string, method: string, balance: number) =>
    `Payment Receipt\nProperty: ${propertyTitle}\nTenant: ${tenantName}\nAmount: ${formatUGX(amount)}\nDate: ${formatDate(date)}\nMethod: ${method}\nBalance: ${formatUGX(balance)}`,

  inquiry: (propertyName: string) =>
    `Hello, I'm interested in ${propertyName}. Is it still available?`,

  generic: (message: string) => message,
};
