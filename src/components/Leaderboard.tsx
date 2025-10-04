import { Agent } from "@/types/chess";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaderboardProps {
  agents: Agent[];
}

export const Leaderboard = ({ agents }: LeaderboardProps) => {
  const sortedAgents = [...agents].sort((a, b) => b.elo - a.elo);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Leaderboard</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Live ELO Rankings</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {sortedAgents.map((agent, index) => {
            const winRate = Math.round(
              (agent.wins / (agent.wins + agent.losses + agent.draws)) * 100
            );
            const isTop3 = index < 3;

            return (
              <div
                key={agent.id}
                className={`p-4 rounded-lg border transition-all duration-200 hover:border-primary/50 ${
                  isTop3
                    ? "bg-primary/5 border-primary/20"
                    : "bg-secondary/30 border-border"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold font-mono ${
                        index === 0
                          ? "bg-success text-success-foreground"
                          : index === 1
                          ? "bg-primary/20 text-primary"
                          : index === 2
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {agent.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        v{agent.version}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-primary">
                      {agent.elo}
                    </div>
                    <div className="text-xs text-muted-foreground">ELO</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-success" />
                      <span className="text-success font-mono font-medium">
                        {agent.wins}W
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-destructive" />
                      <span className="text-destructive font-mono font-medium">
                        {agent.losses}L
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono">
                      {agent.draws}D
                    </span>
                  </div>
                  <div className="font-mono font-medium text-foreground">
                    {winRate}% WR
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
