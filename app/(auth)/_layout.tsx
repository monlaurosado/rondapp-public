import { Stack } from "expo-router/stack";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="onboarding" options={{ title: "Rondapp", headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
      <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
      <Stack.Screen name="check-email" options={{ title: "Confirma email" }} />
      <Stack.Screen name="age-gate" options={{ title: "Mayores de 18" }} />
      <Stack.Screen name="complete-profile" options={{ title: "Perfil" }} />
    </Stack>
  );
}
