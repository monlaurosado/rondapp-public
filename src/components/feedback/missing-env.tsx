import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { colors, spacing } from "@/constants/theme";
import { missingEnv } from "@/lib/env";

export function MissingEnvScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="title">Rondapp</Text>
        <Text muted>Faltan variables de entorno de Supabase.</Text>
      </View>
      <Card>
        <Text variant="subtitle">Configuración pendiente</Text>
        <Text muted>
          Revisa `.env` y define estas variables antes de usar la app con backend.
        </Text>
        <View style={styles.list}>
          {missingEnv.map((key) => (
            <Text key={key} variant="label" style={styles.code}>
              {key}
            </Text>
          ))}
        </View>
      </Card>
      <Card>
        <Text variant="subtitle">Siguiente paso</Text>
        <Text muted>
          Copia `.env.example`, rellena la URL y publishable key de Supabase, y reinicia
          Expo con `npm run start:clear`.
        </Text>
        <Button variant="secondary">Core bloqueado hasta configurar Supabase</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  list: {
    gap: spacing.sm,
  },
  code: {
    color: colors.warning,
  },
});
