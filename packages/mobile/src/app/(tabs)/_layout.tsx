import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { colors, typography } from '@/theme';
import AntDesign from '@expo/vector-icons/AntDesign';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? colors.accent : colors.textSecondary;
  const icons: Record<string, React.ReactNode> = {
    home: <AntDesign name="home" size={24} color={color} />,
    stats: <AntDesign name="fund" size={24} color={color} />,
    profile: <AntDesign name="user" size={24} color={color} />,
  };
  return icons[name] || null;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 83,
          paddingBottom: 28,
          paddingTop: 8,
          position: 'absolute',
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          ...typography.caption1,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '统计',
          tabBarIcon: ({ focused }) => <TabIcon name="stats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
