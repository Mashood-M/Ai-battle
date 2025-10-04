import { Play, Pause, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Agent } from "@/types/chess";
import { MatchSpeed } from "@/types/chess";

interface MatchStatusProps {
  agent1: Agent | null;
  agent2: Agent | null;
  isPlaying: boolean;
  moveNumber: number;
  currentTurn: "white" | "black";
  speed: MatchSpeed;
  result: string | null;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: () => void;
}

export const MatchStatus = ({
  agent1,
  agent2,
  isPlaying,
  moveNumber,
  currentTurn,
  speed,
  result,
  onPlayPause,
  onReset,
  onSpeedChange,
}: MatchStatusProps) => {
  const speedLabels = {
    normal: "1x",
    fast: "2x",
    instant: "⚡",
  };

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Move</div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {moveNumber}
              </div>
            </div>

            <div className="h-12 w-px bg-border" />

            <div>
              <div className="text-xs text-muted-foreground mb-1">Turn</div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    currentTurn === "white" ? "bg-board-light" : "bg-board-dark"
                  }`}
                />
                <span className="text-sm font-semibold text-foreground">
                  {currentTurn === "white"
                    ? agent1?.name || "White"
                    : agent2?.name || "Black"}
                </span>
              </div>
            </div>

            {result && (
              <>
                <div className="h-12 w-px bg-border" />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Result</div>
                  <div className="text-sm font-bold text-success">{result}</div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onSpeedChange}
              className="border-border hover:bg-secondary"
            >
              {speed === "instant" ? (
                <Zap className="w-4 h-4" />
              ) : (
                <span className="text-xs font-mono font-bold">{speedLabels[speed]}</span>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={onPlayPause}
              disabled={!agent1 || !agent2}
              className="border-border hover:bg-secondary"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={onReset}
              className="border-border hover:bg-secondary"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};
