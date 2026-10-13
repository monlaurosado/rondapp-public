import type { ComponentProps } from "react";

import { GlassButton } from "@/components/ui/glass-button";

export function PrimaryButton(props: Omit<ComponentProps<typeof GlassButton>, "variant">) {
  return <GlassButton {...props} variant="primary" />;
}
