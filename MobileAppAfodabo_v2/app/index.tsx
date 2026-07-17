/**
 * Index — root redirect. Actual routing handled by _layout auth effect.
 */

import { View } from "react-native";
import Colors from "@/constants/colors";

export default function Index() {
  return <View style={{ flex: 1, backgroundColor: Colors.light.background }} />;
}
