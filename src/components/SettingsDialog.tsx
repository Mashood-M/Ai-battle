import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiKeys } from "@/types/chess";

interface SettingsDialogProps {
  apiKeys: ApiKeys;
  onUpdateApiKey: (provider: keyof ApiKeys, key: string) => void;
}

export const SettingsDialog = ({ apiKeys, onUpdateApiKey }: SettingsDialogProps) => {
  const [localKeys, setLocalKeys] = useState<ApiKeys>(apiKeys);

  const handleSave = () => {
    Object.entries(localKeys).forEach(([provider, key]) => {
      if (key) {
        onUpdateApiKey(provider as keyof ApiKeys, key);
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="ml-2">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">API Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your API keys to power the AI chess decisions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="deepseek" className="text-foreground">
              DeepSeek API Key
            </Label>
            <Input
              id="deepseek"
              type="password"
              placeholder="sk-..."
              value={localKeys.deepseek || ""}
              onChange={(e) => setLocalKeys({ ...localKeys, deepseek: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="grok" className="text-foreground">
              Grok API Key
            </Label>
            <Input
              id="grok"
              type="password"
              placeholder="xai-..."
              value={localKeys.grok || ""}
              onChange={(e) => setLocalKeys({ ...localKeys, grok: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gemini" className="text-foreground">
              Gemini API Key
            </Label>
            <Input
              id="gemini"
              type="password"
              placeholder="AIza..."
              value={localKeys.gemini || ""}
              onChange={(e) => setLocalKeys({ ...localKeys, gemini: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="claude" className="text-foreground">
              Claude API Key
            </Label>
            <Input
              id="claude"
              type="password"
              placeholder="sk-ant-..."
              value={localKeys.claude || ""}
              onChange={(e) => setLocalKeys({ ...localKeys, claude: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="openai" className="text-foreground">
              OpenAI API Key (GPT-5)
            </Label>
            <Input
              id="openai"
              type="password"
              placeholder="sk-..."
              value={localKeys.openai || ""}
              onChange={(e) => setLocalKeys({ ...localKeys, openai: e.target.value })}
              className="bg-background border-border"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            Save Keys
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
