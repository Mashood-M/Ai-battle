import { Play, Pause, RotateCcw, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Agent } from "@/types/chess";

interface MatchStatusProps {
  agent1: Agent | null;
  agent2: Agent | null;
  isPlaying: boolean;
  currentTurn: "white" | "black";
  result: string | null;
  isLooping: boolean;
  isOnline: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onToggleLoop: () => void;
}

export const MatchStatus = ({
  agent1,
  agent2,
  isPlaying,
  currentTurn,
  result,
  isLooping,
  isOnline,
  onPlayPause,
  onReset,
  onToggleLoop,
}: MatchStatusProps) => {

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
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

          {/* Center credit */}
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs md:text-sm text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">Elevates</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onPlayPause}
              disabled={!agent1 || !agent2 || (!isOnline && !isPlaying)}
              className="border-border hover:bg-secondary"
              title={!isOnline && !isPlaying ? "Cannot start game - no internet connection" : ""}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>

            <Button
              variant={isLooping ? "default" : "outline"}
              size="icon"
              onClick={onToggleLoop}
              disabled={!agent1 || !agent2}
              className={`border-border hover:bg-secondary ${
                isLooping ? "bg-primary text-primary-foreground" : ""
              }`}
              title={isLooping ? "Disable auto-restart" : "Enable auto-restart (30s delay)"}
            >
              <Repeat className="w-4 h-4" />
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
