import { Crown } from "lucide-react";
import { Agent, ApiKeys } from "@/types/chess";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Settings dialog removed per requirements

interface HeaderProps {
  agents: Agent[];
  agent1: Agent | null;
  agent2: Agent | null;
  onAgent1Change: (agentId: string) => void;
  onAgent2Change: (agentId: string) => void;
  apiKeys: ApiKeys;
}

export const Header = ({
  agents,
  agent1,
  agent2,
  onAgent1Change,
  onAgent2Change,
  apiKeys,
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
              <h1 className="text-xl font-bold text-foreground">AI Battle</h1>
            </div>
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
