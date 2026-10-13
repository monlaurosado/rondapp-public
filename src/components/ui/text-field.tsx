import type { TextInputProps } from "react-native";

import { GlassInput } from "@/components/ui/glass-input";

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...props }: TextFieldProps) {
  return <GlassInput label={label} style={style} {...props} />;
}
