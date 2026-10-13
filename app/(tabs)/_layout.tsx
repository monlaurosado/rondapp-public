import { Tabs, useRouter } from "expo-router";

import { GlassTabBar } from "@/components/navigation/glass-tab-bar";
import { colors } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { useGroupSelection } from "@/features/groups/selection";

export default function TabsLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const groupsQuery = useMyGroups(user?.id);
  const groups = groupsQuery.data ?? [];
  const { selectedGroupId } = useGroupSelection(user?.id, groups);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.background.base },
        headerTintColor: colors.text.primary,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Inicio", tabBarLabel: "Inicio" }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: "Grupos", tabBarLabel: "Grupos" }}
      />
      <Tabs.Screen
        name="launch"
        listeners={{
          tabPress: (event) => {
            if (!selectedGroupId) return;

            event.preventDefault();
            router.push({
              pathname: "/capture",
              params: {
                intent: "createRound",
                groupId: selectedGroupId,
              },
            });
          },
        }}
        options={{
          title: "Cámara",
          tabBarLabel: "Cámara",
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{ title: "Ranking", tabBarLabel: "Ranking" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Tú", tabBarLabel: "Tú" }}
      />
    </Tabs>
  );
}
