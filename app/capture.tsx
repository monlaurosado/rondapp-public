import * as Crypto from "expo-crypto";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";

import { useToast } from "@/components/feedback/toast";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { ErrorState, LoadingState } from "@/components/ui/state";
import { colors, spacing } from "@/design/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { useMyGroups } from "@/features/groups/hooks";
import { useGroupSelection } from "@/features/groups/selection";
import { useNetworkStatus } from "@/features/network/network-status";
import { MomentCamera } from "@/features/rounds/components/moment-camera";
import { MomentComposer } from "@/features/rounds/components/moment-composer";
import {
  useActiveRounds,
  useCreateMoment,
  useCreateRound,
} from "@/features/rounds/hooks";
import { getErrorMessage } from "@/lib/errors";

type CaptureIntent = "createRound" | "createMoment";
type CaptureStep = "camera" | "preview";
type CaptureMetadata = { caption?: string; drinkType?: string | null };
type CaptureOperationIds = { momentId: string; roundId?: string };

function uploadPhaseMessage(phase: "compressing" | "uploading" | "publishing" | null) {
  if (phase === "compressing") return "Preparando la foto…";
  if (phase === "uploading") return "Subiendo la foto…";
  if (phase === "publishing") return "Publicando el momento…";
  return null;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isCaptureIntent(value?: string): value is CaptureIntent {
  return value === "createRound" || value === "createMoment";
}

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    intent?: string | string[];
    groupId?: string | string[];
    roundId?: string | string[];
  }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const groupsQuery = useMyGroups(user?.id);
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const { selectGroup } = useGroupSelection(user?.id, groups);
  const createRound = useCreateRound(user?.id);
  const createMoment = useCreateMoment(user?.id);
  const { isOffline } = useNetworkStatus();
  const submitInFlightRef = useRef(false);
  const submittedMetadataRef = useRef<CaptureMetadata | null>(null);
  const [step, setStep] = useState<CaptureStep>("camera");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [operationIds, setOperationIds] = useState<CaptureOperationIds | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metadataLocked, setMetadataLocked] = useState(false);
  const [draftMetadata, setDraftMetadata] = useState<CaptureMetadata>({});

  const rawIntent = firstParam(params.intent);
  const intent = isCaptureIntent(rawIntent) ? rawIntent : null;
  const groupId = firstParam(params.groupId);
  const roundId = firstParam(params.roundId);
  const shouldCheckForActiveRound = Boolean(
    user && intent === "createRound" && groupId,
  );
  const activeRoundQuery = useActiveRounds(
    shouldCheckForActiveRound ? user?.id : undefined,
    shouldCheckForActiveRound ? groupId : undefined,
  );
  const blockingActiveRound = activeRoundQuery.data?.[0];
  const isSubmitting = createRound.isPending || createMoment.isPending;
  const progressMessage = uploadPhaseMessage(createRound.phase ?? createMoment.phase);
  const currentGroup = groups.find((membership) => membership.group_id === groupId);

  useEffect(() => {
    if (intent === "createRound" && groupId && currentGroup) {
      selectGroup(groupId);
    }
  }, [currentGroup, groupId, intent, selectGroup]);

  const closeFlow = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/home");
  };

  useEffect(() => {
    if (process.env.EXPO_OS !== "android") return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSubmitting) return true;
      if (step === "preview") {
        return false;
      }
      if (imageUri) {
        setStep("preview");
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [imageUri, isSubmitting, step]);

  if (!user) return <Redirect href="/login" />;

  const invalidParams =
    !intent ||
    !groupId ||
    (intent === "createMoment" && !roundId);

  const submit = async ({ caption, drinkType }: CaptureMetadata) => {
    if (
      !intent ||
      !groupId ||
      !imageUri ||
      !operationIds ||
      submitInFlightRef.current
    ) return;

    if (isOffline) {
      setErrorMessage("No hay conexión. Conservamos la foto para que puedas publicarla al volver a estar online.");
      return;
    }

    submitInFlightRef.current = true;
    const publicationMetadata = submittedMetadataRef.current ?? { caption, drinkType };
    submittedMetadataRef.current = publicationMetadata;
    setMetadataLocked(true);
    setErrorMessage(null);
    try {
      if (intent === "createRound") {
        if (!operationIds.roundId) return;
        const createdRoundId = await createRound.mutateAsync({
          roundId: operationIds.roundId,
          momentId: operationIds.momentId,
          groupId,
          imageUri,
          caption: publicationMetadata.caption,
          drinkType: publicationMetadata.drinkType,
        });
        router.replace(`/round/${createdRoundId}`);
        return;
      }

      if (!roundId) return;
      await createMoment.mutateAsync({
        momentId: operationIds.momentId,
        roundId,
        groupId,
        imageUri,
        caption: publicationMetadata.caption,
        drinkType: publicationMetadata.drinkType,
      });
      showToast({
        kind: "success",
        title: "Momento subido",
        message: "Tu foto ya está en la ronda.",
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/round/${roundId}`);
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "La foto no ha subido. Puedes reintentarlo sin perderla."),
      );
    } finally {
      submitInFlightRef.current = false;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          autoHideHomeIndicator: true,
          statusBarHidden: true,
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.primitive.black },
        }}
      />

      {invalidParams ? (
        <Screen variant="launch" contentStyle={styles.invalid} bottomInset={spacing.xl}>
          <View style={styles.invalidCopy}>
            <AppText variant="h1" style={styles.center}>No podemos abrir la cámara</AppText>
            <AppText secondary style={styles.center}>
              Falta información de la ronda o del grupo. Vuelve atrás e inténtalo de nuevo.
            </AppText>
          </View>
          <Button onPress={closeFlow}>Volver</Button>
        </Screen>
      ) : shouldCheckForActiveRound && activeRoundQuery.isLoading ? (
        <Screen variant="launch" contentStyle={styles.guard} bottomInset={spacing.xl}>
          <LoadingState label="Comprobando el grupo…" />
        </Screen>
      ) : shouldCheckForActiveRound && activeRoundQuery.error ? (
        <Screen variant="launch" contentStyle={styles.guard} bottomInset={spacing.xl}>
          <ErrorState
            message={getErrorMessage(activeRoundQuery.error)}
            onRetry={() => activeRoundQuery.refetch()}
          />
          <Button variant="secondary" onPress={closeFlow}>Volver</Button>
        </Screen>
      ) : blockingActiveRound ? (
        <Screen variant="launch" contentStyle={styles.guard} bottomInset={spacing.xl}>
          <View style={styles.invalidCopy}>
            <AppText variant="h1" style={styles.center}>Ya hay una ronda activa</AppText>
            <AppText secondary style={styles.center}>
              En {currentGroup?.group.name ?? "este grupo"} hay que responder a la ronda en marcha antes de abrir otra.
            </AppText>
          </View>
          <Button
            icon="camera.fill"
            onPress={() => router.replace({
              pathname: "/capture",
              params: {
                intent: "createMoment",
                groupId,
                roundId: blockingActiveRound.id,
              },
            })}
          >
            Responder ahora
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.replace(`/round/${blockingActiveRound.id}`)}
          >
            Ver la ronda
          </Button>
        </Screen>
      ) : step === "camera" ? (
        <MomentCamera
          groupLabel={intent === "createRound" ? currentGroup?.group.name : undefined}
          onChangeGroup={intent === "createRound" ? () => router.replace("/launch") : undefined}
          onCancel={() => {
            if (imageUri) {
              setErrorMessage(null);
              setStep("preview");
            } else {
              closeFlow();
            }
          }}
          onCapture={(uri) => {
            setErrorMessage(null);
            submittedMetadataRef.current = null;
            setMetadataLocked(false);
            setDraftMetadata({});
            setImageUri(uri);
            setOperationIds({
              momentId: Crypto.randomUUID(),
              ...(intent === "createRound" ? { roundId: Crypto.randomUUID() } : {}),
            });
            setStep("preview");
          }}
        />
      ) : imageUri ? (
        <MomentComposer
          caption={draftMetadata.caption ?? ""}
          drinkType={draftMetadata.drinkType ?? null}
          imageUri={imageUri}
          errorMessage={errorMessage}
          loading={isSubmitting}
          metadataLocked={metadataLocked}
          progressMessage={progressMessage}
          submitLabel={intent === "createRound" ? "Lanzar ronda" : "Subir momento"}
          onCancel={closeFlow}
          onRetake={() => {
            setErrorMessage(null);
            setStep("camera");
          }}
          onMetadataChange={setDraftMetadata}
          onSubmit={submit}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  invalid: {
    minHeight: "100%",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  guard: {
    minHeight: "100%",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  invalidCopy: {
    gap: spacing.sm,
  },
  center: {
    textAlign: "center",
  },
});
