/**
 * WhatsApp deep link builder + message templates.
 */

import { Linking, Alert, Platform } from "react-native";
import { formatMoney, formatDate } from "./format";

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
  reminder: (tenantName: string, propertyTitle: string, amount: number, dueDate: string, currency?: string | null) =>
    `Hello ${tenantName}, this is a friendly reminder from your manager at ${propertyTitle}. Rent of ${formatMoney(amount, currency)} was due on ${formatDate(dueDate)}. Please arrange payment. Thank you!`,

  confirmation: (tenantName: string, amount: number, propertyTitle: string, balance: number, currency?: string | null) =>
    `Hello ${tenantName}, your payment of ${formatMoney(amount, currency)} for ${propertyTitle} has been confirmed. New balance: ${formatMoney(balance, currency)}. Thank you!`,

  welcome: (tenantName: string, propertyTitle: string, rent: number, period: string, managerName: string, currency?: string | null) =>
    `Welcome to ${propertyTitle}, ${tenantName}! Your tenancy is now active. Rent: ${formatMoney(rent, currency)}/${period}. Your manager is ${managerName}. Welcome home!`,

  receipt: (propertyTitle: string, tenantName: string, amount: number, date: string, method: string, balance: number, currency?: string | null) =>
    `Payment Receipt\nProperty: ${propertyTitle}\nTenant: ${tenantName}\nAmount: ${formatMoney(amount, currency)}\nDate: ${formatDate(date)}\nMethod: ${method}\nBalance: ${formatMoney(balance, currency)}`,

  inquiry: (propertyName: string) =>
    `Hello, I'm interested in ${propertyName}. Is it still available?`,

  generic: (message: string) => message,
};
