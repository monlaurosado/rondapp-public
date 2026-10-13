import React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { logger } from "@/lib/logger";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("Unhandled React error", error, {
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Screen>
          <Card>
            <Text variant="title">Algo se ha roto.</Text>
            <Text muted>
              Hemos parado esta pantalla para que no se quede en blanco. Vuelve a intentarlo.
            </Text>
            <Button onPress={() => this.setState({ hasError: false })}>Reintentar</Button>
          </Card>
        </Screen>
      );
    }

    return this.props.children;
  }
}
