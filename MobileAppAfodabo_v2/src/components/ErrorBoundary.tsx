/**
 * ErrorBoundary: catches render-time crashes anywhere below the root layout
 * and shows a branded recovery screen instead of a blank app. Reset remounts
 * the tree via the key prop in _layout.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { BrandMark } from "@/src/components/BrandMark";
import { Button } from "@/src/components/Button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Kept in every build: a crashed screen must be visible in production
    // logs, unlike the dev-only auth diagnostics.
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View style={styles.container}>
        <BrandMark size="md" />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          The app hit an unexpected error. Your data is safe. Try again, and if
          the problem continues, sign out and back in.
        </Text>
        <View style={styles.action}>
          <Button label="Try Again" onPress={this.handleReset} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  message: {
    fontSize: FontSize.body,
    lineHeight: 22,
    color: Colors.textMuted,
    textAlign: "center",
  },
  action: {
    marginTop: Spacing.md,
    minWidth: 180,
    borderRadius: Radii.button,
  },
});
