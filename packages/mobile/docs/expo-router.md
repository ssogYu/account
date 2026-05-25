# Expo Router 路由指南

> 本文档基于 Expo SDK 55 + expo-router ~55.0.0，详细说明项目路由核心定义、导航 API 和最佳实践。

---

## 目录

- [1. 核心概念](#1-核心概念)
- [2. 项目路由结构](#2-项目路由结构)
- [3. 布局系统 (\_layout.tsx)](#3-布局系统-_layouttsx)
- [4. 导航 API](#4-导航-api)
- [5. 路由参数与类型安全](#5-路由参数与类型安全)
- [6. 最佳实践 Demo](#6-最佳实践-demo)

---

## 1. 核心概念

Expo Router 采用**基于文件系统的路由**，`src/app/` 目录结构即路由结构：

| 规则                 | 说明                                                   |
| -------------------- | ------------------------------------------------------ |
| 文件路径 = 路由路径  | `src/app/about.tsx` → `/about`                         |
| `_layout.tsx`        | 共享布局，包裹子路由                                   |
| `(group)` 括号目录   | 路由分组，**不产生路径段**，仅用于共享布局             |
| `[param]` 方括号目录 | 动态路由参数，如 `src/app/bill/[id].tsx` → `/bill/123` |
| `+not-found.tsx`     | 404 兜底页面                                           |

---

## 2. 项目路由结构

当前项目结构及对应路由：

```
src/app/
├── _layout.tsx              → 根布局 (Stack)
├── (tabs)/
│   ├── _layout.tsx          → Tab 布局 (底部导航)
│   ├── index.tsx            → /           首页（AI智能记账）
│   ├── stats.tsx            → /stats      统计（账单流水+图表）
│   └── profile.tsx          → /profile    我的（家庭+设置）
```

`(tabs)` 是括号分组，不会出现在 URL 中。所以首页路径是 `/` 而非 `/(tabs)/`。

### 后续扩展示例

```
src/app/
├── _layout.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── stats.tsx
│   └── profile.tsx
├── bill/
│   ├── index.tsx            → /bill           账单列表
│   └── [id].tsx             → /bill/:id       账单详情
├── family/
│   ├── manage.tsx           → /family/manage  家庭组管理
│   └── invite.tsx           → /family/invite  邀请成员
├── settings/
│   ├── category.tsx         → /settings/category  分类管理
│   ├── budget.tsx           → /settings/budget    预算设置
│   └── account.tsx          → /settings/account   账户管理
├── add-bill.tsx             → /add-bill       记一笔(Modal)
└── +not-found.tsx           → 404
```

---

## 3. 布局系统 (\_layout.tsx)

### 3.1 根布局 — Stack

文件：`src/app/_layout.tsx`

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

Stack 提供页面栈导航，子页面从右侧滑入，自带返回按钮。

**常用配置：**

```tsx
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#333',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="bill/[id]" options={{ title: '账单详情' }} />
    </Stack>
  );
}
```

### 3.2 Tab 布局

文件：`src/app/(tabs)/_layout.tsx`

```tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen name="stats" options={{ title: '统计' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  );
}
```

**带图标的 Tab：**

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            index: 'home',
            stats: 'stats-chart',
            profile: 'person',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: '#999',
      })}
    >
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen name="stats" options={{ title: '统计' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  );
}
```

---

## 4. 导航 API

### 4.1 声明式导航 — `<Link>`

```tsx
import { Link } from 'expo-router';

// 基本用法
<Link href="/bill/123">查看账单</Link>

// 带参数
<Link href={{ pathname: '/bill/[id]', params: { id: '123' } }}>
  查看账单
</Link>

// 替换当前页面（不加入历史栈）
<Link href="/login" replace>登录</Link>
```

### 4.2 命令式导航 — `router`

```tsx
import { router } from 'expo-router';

// 跳转
router.push('/bill/123');
router.push({ pathname: '/bill/[id]', params: { id: '123' } });

// 替换（登录后常用）
router.replace('/home');

// 返回
router.back();

// 返回到指定路由
router.dismiss(2); // 弹出 2 层
```

### 4.3 Tab 内导航 — `useRouter` / `router`

在 Tab 页面间切换：

```tsx
import { router } from 'expo-router';

// 切换到统计 Tab
router.replace('/stats');
```

### 4.4 页面内获取路由信息 — `useLocalSearchParams`

```tsx
import { useLocalSearchParams } from 'expo-router';

// 在 src/app/bill/[id].tsx 中
export default function BillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // id = "123" when visiting /bill/123
  return <Text>账单 ID: {id}</Text>;
}
```

### 4.5 获取全局路由状态 — `useGlobalSearchParams`

```tsx
import { useGlobalSearchParams } from 'expo-router';

// 任何组件中都能读取当前路由参数（跨组件共享）
const { id } = useGlobalSearchParams();
```

> **注意**：`useLocalSearchParams` 只在对应页面组件中返回参数，`useGlobalSearchParams` 在任何组件中都能获取，但会导致组件在任何导航时重新渲染。

### 4.6 获取当前路径 — `usePathname`

```tsx
import { usePathname } from 'expo-router';

function Breadcrumb() {
  const pathname = usePathname(); // 如 "/bill/123"
  return <Text>当前路径: {pathname}</Text>;
}
```

### 4.7 页面焦点事件 — `useFocusEffect`

```tsx
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function HomeScreen() {
  useFocusEffect(
    useCallback(() => {
      // 每次进入页面时刷新数据
      fetchLatestBills();
    }, []),
  );

  return <Text>首页</Text>;
}
```

---

## 5. 路由参数与类型安全

### 5.1 开启类型路由

`app.json` 中已配置：

```json
{
  "experiments": {
    "typedRoutes": true
  }
}
```

开启后，`href` 会自动校验路径是否存在，`useLocalSearchParams` 也会推断参数类型。

### 5.2 静态类型定义

在 `src/app/_layout.tsx` 同级创建 `+html.tsx` 或通过 Expo Router 自动生成的 `.expo/types/router.d.ts` 获取类型。

手动扩展路由参数类型：

```tsx
// src/app/bill/[id].tsx
import { useLocalSearchParams } from 'expo-router';

type BillDetailParams = {
  id: string;
};

export default function BillDetail() {
  const { id } = useLocalSearchParams<BillDetailParams>();
  return <Text>账单 ID: {id}</Text>;
}
```

---

## 6. 最佳实践 Demo

### Demo 1：账单列表 → 详情页

**文件结构：**

```
src/app/
├── (tabs)/
│   └── index.tsx          → 首页（含账单列表）
├── bill/
│   ├── _layout.tsx        → 账单模块布局
│   ├── index.tsx          → 账单列表
│   └── [id].tsx           → 账单详情
```

**`src/app/bill/_layout.tsx`：**

```tsx
import { Stack } from 'expo-router';

export default function BillLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen name="index" options={{ title: '账单列表' }} />
      <Stack.Screen name="[id]" options={{ title: '账单详情' }} />
    </Stack>
  );
}
```

**`src/app/bill/index.tsx`：**

```tsx
import { View, Text, Pressable, FlatList } from 'react-native';
import { Link } from 'expo-router';

const bills = [
  { id: '1', title: '午餐', amount: 35 },
  { id: '2', title: '地铁', amount: 6 },
  { id: '3', title: '超市', amount: 128 },
];

export default function BillList() {
  return (
    <FlatList
      data={bills}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/bill/[id]', params: { id: item.id } }} asChild>
          <Pressable style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text>{item.title}</Text>
            <Text>¥{item.amount}</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
```

**`src/app/bill/[id].tsx`：**

```tsx
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function BillDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>账单详情 - ID: {id}</Text>
    </View>
  );
}
```

---

### Demo 2：Tab 页面进入时刷新数据

```tsx
// src/app/(tabs)/index.tsx
import { View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export default function HomeScreen() {
  const [bills, setBills] = useState([]);

  useFocusEffect(
    useCallback(() => {
      // 每次切回首页时拉取最新数据
      fetchBills().then(setBills);
    }, []),
  );

  return (
    <View style={{ flex: 1 }}>
      <Text>首页 - {bills.length} 条账单</Text>
    </View>
  );
}
```

---

### Demo 3：登录后替换路由栈

```tsx
// src/app/login.tsx
import { View, Pressable, Text } from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  const handleLogin = async () => {
    await login(username, password);
    // 替换整个路由栈，用户无法返回登录页
    router.replace('/(tabs)');
  };

  return (
    <View>
      <Pressable onPress={handleLogin}>
        <Text>登录</Text>
      </Pressable>
    </View>
  );
}
```

---

### Demo 4：404 兜底页面

**`src/app/+not-found.tsx`：**

```tsx
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>页面不存在</Text>
      <Link href="/" asChild>
        <Pressable>
          <Text>返回首页</Text>
        </Pressable>
      </Link>
    </View>
  );
}
```

---

### Demo 5：Modal 弹出页面

**`src/app/_layout.tsx`：**

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* 以 Modal 形式弹出 */}
      <Stack.Screen name="add-bill" options={{ presentation: 'modal', title: '记一笔' }} />
    </Stack>
  );
}
```

**`src/app/add-bill.tsx`：**

```tsx
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function AddBillScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>添加账单</Text>
      <Pressable onPress={() => router.back()}>
        <Text>关闭</Text>
      </Pressable>
    </View>
  );
}
```

从任何页面调用 `router.push('/add-bill')` 即可弹出 Modal。

---

## 速查表

| 需求         | API                                                |
| ------------ | -------------------------------------------------- |
| 页面跳转     | `router.push('/path')`                             |
| 替换当前页   | `router.replace('/path')`                          |
| 返回上一页   | `router.back()`                                    |
| 声明式链接   | `<Link href="/path">`                              |
| 获取路由参数 | `useLocalSearchParams()`                           |
| 获取当前路径 | `usePathname()`                                    |
| 页面聚焦回调 | `useFocusEffect()`                                 |
| 全局路由参数 | `useGlobalSearchParams()`                          |
| Modal 弹出   | `Stack.Screen options={{ presentation: 'modal' }}` |
| 隐藏 Tab 页  | `Tabs.Screen options={{ href: null }}`             |
| 隐藏 Header  | `options={{ headerShown: false }}`                 |
