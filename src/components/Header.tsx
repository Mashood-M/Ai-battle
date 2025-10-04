import { Crown } from "lucide-react";
import { Agent, ApiKeys } from "@/types/chess";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsDialog } from "./SettingsDialog";

interface HeaderProps {
  agents: Agent[];
  agent1: Agent | null;
  agent2: Agent | null;
  onAgent1Change: (agentId: string) => void;
  onAgent2Change: (agentId: string) => void;
  apiKeys: ApiKeys;
  onUpdateApiKey: (provider: keyof ApiKeys, key: string) => void;
  onSetAllApiKeys?: () => void;
}

export const Header = ({
  agents,
  agent1,
  agent2,
  onAgent1Change,
  onAgent2Change,
  apiKeys,
  onUpdateApiKey,
  onSetAllApiKeys,
}: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Battle Chess</h1>
              <p className="text-xs text-muted-foreground">Watch AI Agents Duel</p>
              <div className="flex gap-1 mt-1">
                {Object.entries(apiKeys).map(([provider, key]) => (
                  <span
                    key={provider}
                    className={`text-xs px-1 py-0.5 rounded ${
                      key ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
                    }`}
                    title={`${provider}: ${key ? "Set" : "Not Set"}`}
                  >
                    {provider}
                  </span>
                ))}
              </div>
            </div>
             <SettingsDialog apiKeys={apiKeys} onUpdateApiKey={onUpdateApiKey} onSetAllApiKeys={onSetAllApiKeys} />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">White</label>
              <Select value={agent1?.id} onValueChange={onAgent1Change}>
                <SelectTrigger className="w-[200px] bg-card border-border">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} disabled={agent.id === agent2?.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {agent.elo}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-muted-foreground font-bold text-lg">VS</div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Black</label>
              <Select value={agent2?.id} onValueChange={onAgent2Change}>
                <SelectTrigger className="w-[200px] bg-card border-border">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} disabled={agent.id === agent1?.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {agent.elo}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
