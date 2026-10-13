import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Screen } from "@/components/ui/screen";
import { colors, radius, spacing } from "@/design/tokens";
import { useNetworkStatus } from "@/features/network/network-status";
import { getErrorMessage } from "@/lib/errors";

const BACK_FLASH_MODES: readonly FlashMode[] = ["off", "auto", "on"];
const CAMERA_PERMISSION_TIMEOUT_MS = 12_000;

function requestCameraPermissionWithTimeout<T>(request: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("La cámara no ha respondido. Puedes reintentar o elegir una foto de la galería.")),
      CAMERA_PERMISSION_TIMEOUT_MS,
    );
  });
  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export function MomentCamera({
  groupLabel,
  onChangeGroup,
  onCapture,
  onCancel,
}: {
  groupLabel?: string;
  onChangeGroup?: () => void;
  onCapture: (uri: string) => void;
  onCancel: () => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const permissionRequestedRef = useRef(false);
  const captureInFlightRef = useRef(false);
  const pickerInFlightRef = useRef(false);
  const deliveredCaptureRef = useRef(false);
  const onCaptureRef = useRef(onCapture);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(() =>
    process.env.EXPO_OS === "web" ? null : true,
  );
  const [cameraSession, setCameraSession] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  const deliverCapture = useCallback((uri: string) => {
    if (deliveredCaptureRef.current) return;
    deliveredCaptureRef.current = true;
    onCaptureRef.current(uri);
  }, []);

  useEffect(() => {
    if (process.env.EXPO_OS !== "web") {
      return;
    }

    let mounted = true;

    CameraView.isAvailableAsync()
      .then((available) => {
        if (mounted) setCameraAvailable(available);
      })
      .catch((error) => {
        if (!mounted) return;
        setCameraAvailable(false);
        setCameraError(getErrorMessage(error, "No hemos podido iniciar la cámara."));
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      process.env.EXPO_OS === "web" ||
      cameraAvailable !== true ||
      permission?.status !== "undetermined" ||
      permissionRequestedRef.current
    ) {
      return;
    }

    permissionRequestedRef.current = true;
    let active = true;
    setIsRequestingPermission(true);
    requestCameraPermissionWithTimeout(requestPermission())
      .catch((error) => {
        if (active) {
          setCameraError(getErrorMessage(error, "No hemos podido pedir acceso a la cámara."));
        }
      })
      .finally(() => {
        if (active) setIsRequestingPermission(false);
      });

    return () => {
      active = false;
    };
  }, [cameraAvailable, permission?.status, requestPermission]);

  useEffect(() => {
    if (process.env.EXPO_OS === "web") return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        getPermission().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [getPermission]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let active = true;
    ImagePicker.getPendingResultAsync()
      .then((result) => {
        if (!active || !result) return;
        if ("code" in result) {
          setCameraError(
            "No hemos podido recuperar la foto elegida. Abre la galería e inténtalo otra vez.",
          );
          return;
        }

        const uri = result.canceled ? null : result.assets[0]?.uri;
        if (uri) deliverCapture(uri);
      })
      .catch(() => {
        if (active) {
          setCameraError(
            "No hemos podido recuperar la foto elegida. Abre la galería e inténtalo otra vez.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [deliverCapture]);

  const requestCameraAccess = async () => {
    permissionRequestedRef.current = true;
    setCameraError(null);
    setIsRequestingPermission(true);
    try {
      await requestCameraPermissionWithTimeout(requestPermission());
    } catch (error) {
      setCameraError(getErrorMessage(error, "No hemos podido pedir acceso a la cámara."));
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const openSettings = async () => {
    setCameraError(null);
    try {
      await Linking.openSettings();
    } catch (error) {
      setCameraError(getErrorMessage(error, "Abre los ajustes del dispositivo para activar la cámara."));
    }
  };

  const pickImage = async () => {
    if (pickerInFlightRef.current || captureInFlightRef.current) return;

    pickerInFlightRef.current = true;
    setCameraError(null);
    setIsPicking(true);
    try {
      if (process.env.EXPO_OS !== "web") {
        await Haptics.selectionAsync().catch(() => undefined);
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.85,
      });
      const uri = result.canceled ? null : result.assets[0]?.uri;
      if (uri) deliverCapture(uri);
    } catch (error) {
      setCameraError(getErrorMessage(error, "No hemos podido abrir tu galería."));
    } finally {
      pickerInFlightRef.current = false;
      setIsPicking(false);
    }
  };

  const takePhoto = async () => {
    if (
      !isReady ||
      captureInFlightRef.current ||
      pickerInFlightRef.current ||
      !cameraRef.current
    ) return;

    captureInFlightRef.current = true;
    setCameraError(null);
    setIsCapturing(true);
    try {
      if (process.env.EXPO_OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      }
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error("La cámara no ha devuelto ninguna foto.");
      deliverCapture(photo.uri);
    } catch (error) {
      setCameraError(getErrorMessage(error, "No hemos podido hacer la foto. Inténtalo otra vez."));
    } finally {
      captureInFlightRef.current = false;
      setIsCapturing(false);
    }
  };

  const cycleFlash = () => {
    if (facing === "front") {
      setFlash((current) => (current === "off" ? "screen" : "off"));
      return;
    }

    setFlash((current) => {
      const index = BACK_FLASH_MODES.indexOf(current);
      return BACK_FLASH_MODES[(index + 1 + BACK_FLASH_MODES.length) % BACK_FLASH_MODES.length];
    });
  };

  const toggleFacing = () => {
    const nextFacing: CameraType = facing === "back" ? "front" : "back";
    setIsReady(false);
    setCameraError(null);
    setFacing(nextFacing);
    setFlash((current) => {
      if (current === "off") return "off";
      return nextFacing === "front" ? "screen" : "auto";
    });
  };

  const retryCamera = () => {
    setCameraError(null);
    setIsReady(false);
    setCameraSession((current) => current + 1);
  };

  const permissionContentStyle = [
    styles.permission,
    { paddingTop: insets.top + spacing.xl },
  ];
  const permissionBottomInset = insets.bottom + spacing.xl;

  if (cameraAvailable === null || permission === null) {
    return (
      <Screen
        variant="launch"
        contentStyle={permissionContentStyle}
        bottomInset={permissionBottomInset}
      >
        <ActivityIndicator color={colors.accent.primary} size="large" />
        <AppText variant="bodyStrong" style={styles.center}>Preparando la cámara…</AppText>
      </Screen>
    );
  }

  if (!cameraAvailable) {
    return (
      <Screen
        variant="launch"
        contentStyle={permissionContentStyle}
        bottomInset={permissionBottomInset}
      >
        <View style={styles.permissionIcon}>
          <Icon name="camera.fill" size={28} color={colors.accent.primary} />
        </View>
        <AppText variant="h1" style={styles.center}>No encontramos una cámara</AppText>
        <AppText secondary style={styles.center}>
          Puedes continuar eligiendo una foto de tu galería.
        </AppText>
        {cameraError ? <AppText variant="caption" style={styles.errorText}>{cameraError}</AppText> : null}
        <Button variant="secondary" icon="images" loading={isPicking} onPress={pickImage}>
          Elegir de la galería
        </Button>
        <Button variant="ghost" disabled={isPicking} onPress={onCancel}>Volver</Button>
      </Screen>
    );
  }

  if (!permission.granted) {
    const mustOpenSettings = permission.canAskAgain === false && process.env.EXPO_OS !== "web";

    return (
      <Screen
        variant="launch"
        contentStyle={permissionContentStyle}
        bottomInset={permissionBottomInset}
      >
        <View style={styles.permissionIcon}>
          <Icon name="camera.fill" size={28} color={colors.accent.primary} />
        </View>
        <AppText variant="h1" style={styles.center}>La ronda empieza con una foto</AppText>
        <AppText secondary style={styles.center}>
          Activa la cámara o elige una imagen de tu galería.
        </AppText>
        {cameraError ? <AppText variant="caption" style={styles.errorText}>{cameraError}</AppText> : null}
        <Button
          icon="camera.fill"
          loading={isRequestingPermission}
          onPress={mustOpenSettings ? openSettings : requestCameraAccess}
        >
          {mustOpenSettings ? "Abrir ajustes" : "Dar acceso a la cámara"}
        </Button>
        <Button
          variant="secondary"
          icon="images"
          loading={isPicking}
          disabled={isRequestingPermission}
          onPress={pickImage}
        >
          Elegir de la galería
        </Button>
        <Button
          variant="ghost"
          disabled={isRequestingPermission || isPicking}
          onPress={onCancel}
        >
          Volver
        </Button>
      </Screen>
    );
  }

  const controlsDisabled = !isReady || isCapturing || isPicking;
  const controlsBottom = Math.max(insets.bottom, spacing.md) + spacing.lg;
  const flashLabel =
    flash === "off"
      ? "Flash desactivado"
      : flash === "auto"
        ? "Flash automático"
        : flash === "screen"
          ? "Flash de pantalla activado"
          : "Flash activado";

  return (
    <View style={styles.cameraShell}>
      {isFocused ? (
        <CameraView
          key={`${facing}-${cameraSession}`}
          ref={cameraRef}
          style={styles.camera}
          mode="picture"
          facing={facing}
          flash={flash}
          mirror={facing === "front"}
          onCameraReady={() => {
            setCameraError(null);
            setIsReady(true);
          }}
          onMountError={(event) => {
            setIsReady(false);
            setCameraError(event.message || "No hemos podido iniciar la cámara.");
          }}
        />
      ) : (
        <View style={styles.camera} />
      )}

      <LinearGradient
        colors={[colors.overlay.clear, colors.overlay.photoStrong]}
        style={[styles.bottomScrim, { pointerEvents: "none" }]}
      />

      <View
        style={[
          styles.topBar,
          {
            top: insets.top + spacing.md + (isOffline ? 52 : 0),
            pointerEvents: "box-none",
          },
        ]}
      >
        <View style={styles.topBarContent}>
          <IconButton
            icon="x"
            label="Cancelar"
            disabled={isCapturing || isPicking}
            onPress={onCancel}
          />
          {groupLabel && onChangeGroup ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cambiar grupo. Grupo actual: ${groupLabel}`}
              accessibilityState={{ disabled: isCapturing || isPicking }}
              disabled={isCapturing || isPicking}
              onPress={onChangeGroup}
              style={[
                styles.groupChip,
                (isCapturing || isPicking) && styles.groupChipDisabled,
              ]}
            >
              <Icon name="person.3.fill" size={15} color={colors.accent.primary} />
              <AppText numberOfLines={1} variant="caption" style={styles.groupChipText}>
                {groupLabel}
              </AppText>
              <Icon name="chevron.down" size={14} color={colors.text.secondary} />
            </Pressable>
          ) : (
            <View style={styles.topSpacer} />
          )}
          {process.env.EXPO_OS === "web" ? (
            <View style={styles.topSpacer} />
          ) : (
            <View style={styles.flashControl}>
              <IconButton
                icon="bolt.fill"
                label={flashLabel}
                active={flash !== "off"}
                disabled={controlsDisabled}
                onPress={cycleFlash}
              />
              {flash !== "off" ? (
                <View style={[styles.flashBadge, { pointerEvents: "none" }]}>
                  <AppText variant="overline" style={styles.flashBadgeText}>
                    {flash === "auto" ? "A" : "ON"}
                  </AppText>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {!isReady && !cameraError ? (
        <View style={[styles.cameraLoading, { pointerEvents: "none" }]}>
          <ActivityIndicator color={colors.text.primary} size="large" />
        </View>
      ) : null}

      {cameraError ? (
        <View
          style={[
            styles.messageHost,
            { bottom: controlsBottom + 104, pointerEvents: "box-none" },
          ]}
        >
          <View style={styles.cameraMessage}>
            <AppText variant="caption" style={styles.cameraMessageText}>{cameraError}</AppText>
            {!isReady ? (
              <Button compact variant="secondary" onPress={retryCamera}>Reintentar</Button>
            ) : null}
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.controlsHost,
          { bottom: controlsBottom, pointerEvents: "box-none" },
        ]}
      >
        <View style={styles.controls}>
          <IconButton
            icon="images"
            label="Abrir galería"
            disabled={isCapturing || isPicking}
            onPress={pickImage}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hacer foto"
            accessibilityState={{ busy: isCapturing, disabled: controlsDisabled }}
            disabled={controlsDisabled}
            onPress={takePhoto}
            style={[styles.shutter, controlsDisabled && styles.shutterDisabled]}
          >
            {isCapturing ? (
              <ActivityIndicator color={colors.primitive.black} size="large" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
          <IconButton
            icon="switch.camera"
            label="Girar cámara"
            disabled={controlsDisabled}
            onPress={toggleFacing}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permission: {
    minHeight: "100%",
    justifyContent: "center",
    gap: spacing.lg,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.glassStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.active,
  },
  center: {
    textAlign: "center",
  },
  errorText: {
    color: colors.state.error,
    textAlign: "center",
  },
  cameraShell: {
    flex: 1,
    backgroundColor: colors.primitive.black,
  },
  camera: {
    flex: 1,
    backgroundColor: colors.primitive.black,
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  topBarContent: {
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topSpacer: {
    width: 44,
  },
  groupChip: {
    minHeight: 40,
    maxWidth: "62%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay.photoStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  groupChipDisabled: {
    opacity: 0.58,
  },
  groupChipText: {
    flexShrink: 1,
    color: colors.text.primary,
  },
  flashControl: {
    width: 44,
    height: 44,
  },
  flashBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    minWidth: 22,
    minHeight: 18,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.accent.secondary,
  },
  flashBadgeText: {
    color: colors.text.inverse,
  },
  cameraLoading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  messageHost: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  cameraMessage: {
    width: "100%",
    maxWidth: 480,
    borderRadius: radius.md,
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.overlay.photoStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.glass,
  },
  cameraMessageText: {
    color: colors.text.primary,
    textAlign: "center",
  },
  controlsHost: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  controls: {
    width: "100%",
    maxWidth: 480,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: colors.text.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primitive.white,
  },
  shutterDisabled: {
    opacity: 0.58,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.text.primary,
  },
});
