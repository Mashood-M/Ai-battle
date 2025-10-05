import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GameStopNotificationProps {
  reason: string | null;
  onReset: () => void;
}

export const GameStopNotification = ({ reason, onReset }: GameStopNotificationProps) => {
  if (!reason) return null;

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertTriangle className="h-5 w-5" />
          Game Stopped
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {reason}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Possible causes:</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>• API rate limit exceeded (50 requests/day for free tier)</div>
            <div>• Invalid or missing API keys</div>
            <div>• Network connectivity issues</div>
            <div>• API service temporarily unavailable</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Solutions:</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>• Check your API keys in the settings</div>
            <div>• Wait for rate limits to reset (24 hours)</div>
            <div>• Add credits to OpenRouter for higher limits</div>
            <div>• Try different AI agents</div>
          </div>
        </div>

        <Button 
          onClick={onReset} 
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Start New Game
        </Button>
      </CardContent>
    </Card>
  );
};
