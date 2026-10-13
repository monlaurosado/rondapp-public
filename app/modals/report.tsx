import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Screen } from "@/components/ui/screen";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { TextField } from "@/components/ui/text-field";
import { reportReasons } from "@/constants/copy";
import { colors, radius, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useReportMoment } from "@/features/moderation/hooks";
import { getMomentById } from "@/features/rounds/api";
import { getErrorMessage } from "@/lib/errors";
import type { Moment } from "@/types/domain";

export default function ReportModal() {
  const router = useRouter();
  const { momentId } = useLocalSearchParams<{ momentId?: string }>();
  const { user } = useAuth();
  const reportMoment = useReportMoment(user?.id);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [reason, setReason] = useState<string>("offensive");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(Boolean(momentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!momentId) {
      return () => {
        active = false;
      };
    }

    getMomentById(momentId)
      .then((data) => {
        if (active) setMoment(data);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [momentId]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!momentId) {
    return (
      <Screen>
        <ErrorState message="Falta el momento a reportar." />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (error || !moment) {
    return (
      <Screen>
        <ErrorState message={error ?? "Momento no encontrado."} />
      </Screen>
    );
  }

  const submit = async () => {
    try {
      await reportMoment.mutateAsync({ moment, reason, details });
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, "No hemos podido reportar este momento."));
    }
  };

  return (
    <Screen variant="modal" keyboard bottomInset={spacing.xl}>
      <View style={styles.header}>
        <AppText variant="overline" style={styles.eyebrow}>SEGURIDAD</AppText>
        <AppText variant="h1">Reportar publicación</AppText>
        <AppText secondary>Dejarás de ver este contenido. Guardaremos el reporte para revisarlo y actuar si infringe las normas.</AppText>
      </View>
      <GlassPanel style={styles.form}>
        <AppText variant="h3">¿Qué ha pasado?</AppText>
        <View style={styles.reasons}>
          {reportReasons.map((item) => {
            const selected = reason === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Motivo: ${item.label}`}
                accessibilityState={{ selected }}
                key={item.id}
                onPress={() => setReason(item.id)}
                style={[styles.reason, selected ? styles.reasonSelected : null]}
              >
                <AppText variant="caption" style={selected ? styles.selectedText : null}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="Comentario opcional"
          value={details}
          onChangeText={setDetails}
          placeholder="Añade contexto si hace falta"
          multiline
        />
        {error ? <AppText variant="caption" style={{ color: colors.state.error }}>{error}</AppText> : null}
        <Button icon="checkmark.shield.fill" loading={reportMoment.isPending} onPress={submit}>
          Enviar reporte
        </Button>
        <Button variant="ghost" onPress={() => router.back()}>Cancelar</Button>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.state.warning,
  },
  form: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface.card,
  },
  reasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  reason: {
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.glassStrong,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  reasonSelected: {
    backgroundColor: colors.accent.primary,
  },
  selectedText: {
    color: colors.text.inverse,
    fontWeight: "800",
  },
});
