import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CreditCard, ExternalLink } from "lucide-react";

interface RateLimitNotificationProps {
  isExceeded: boolean;
  resetTime: number | null;
  onReset: () => void;
}

export const RateLimitNotification = ({ isExceeded, resetTime, onReset }: RateLimitNotificationProps) => {
  if (!isExceeded) return null;

  const getTimeUntilReset = () => {
    if (!resetTime) return "Unknown";
    const now = Date.now();
    const diff = resetTime - now;
    
    if (diff <= 0) return "Reset now!";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const resetDate = resetTime ? new Date(resetTime).toLocaleString() : "Unknown";

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-5 w-5" />
          Rate Limit Exceeded
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You've hit the daily free tier limit (50 requests) for OpenRouter models.
            The game will stop when an affected agent tries to make a move.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Time until reset:</span>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getTimeUntilReset()}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reset at:</span>
            <span className="text-sm text-muted-foreground">{resetDate}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Solutions:</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Wait 24 hours for the limit to reset</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Add 10 credits to unlock 1000 requests per day</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <a 
                href="https://openrouter.ai/settings/credits" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Visit OpenRouter Credits
              </a>
            </div>
          </div>
        </div>

        <Button 
          onClick={onReset} 
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          Reset Status (if limits have reset)
        </Button>
      </CardContent>
    </Card>
  );
};
