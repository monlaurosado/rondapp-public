import { EmptyState as NovaEmptyState } from "@/components/ui/empty-state";
import { ErrorState as NovaErrorState } from "@/components/ui/error-state";
import { LoadingState as NovaLoadingState } from "@/components/ui/loading-state";

export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return <NovaLoadingState label={label} />;
}

export function EmptyState({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action?: string;
  onPress?: () => void;
}) {
  return <NovaEmptyState title={title} body={body} action={action} onPress={onPress} />;
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return <NovaErrorState message={message} onRetry={onRetry} />;
}
