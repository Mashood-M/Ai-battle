import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Chessboard } from "@/components/Chessboard";
import { GameStatus } from "@/components/GameStatus";
import { MatchStatus } from "@/components/MatchStatus";
// Rate limit notification removed
import { GameStopNotification } from "@/components/GameStopNotification";
import { AGENTS } from "@/data/agents";
import { useChessMatch } from "@/hooks/useChessMatch";
import { useApiKeys } from "@/hooks/useApiKeys";
import { Agent } from "@/types/chess";
import { aiChessService } from "@/services/aiChessService";

const Index = () => {
  const [agent1, setAgent1] = useState<Agent | null>(AGENTS[0]);
  const [agent2, setAgent2] = useState<Agent | null>(AGENTS[1]);
  // Rate limit status removed
  const { apiKeys } = useApiKeys();
  const { game, isPlaying, speed, result, moveTimes, currentMoveStart, currentThinkingAgent, gameStopReason, isThinking, togglePlayPause, resetGame, cycleSpeed } =
    useChessMatch(agent1, agent2, apiKeys);

  // Rate limit polling removed

  const handleAgent1Change = (agentId: string) => {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent) {
      setAgent1(agent);
      resetGame();
    }
  };

  const handleAgent2Change = (agentId: string) => {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent) {
      setAgent2(agent);
      resetGame();
    }
  };

  const moveNumber = Math.floor(game.history().length / 2) + 1;
  const currentTurn = game.turn() === "w" ? "white" : "black";

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header
        agents={AGENTS}
        agent1={agent1}
        agent2={agent2}
        onAgent1Change={handleAgent1Change}
        onAgent2Change={handleAgent2Change}
        apiKeys={apiKeys}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex items-center justify-center overflow-hidden">
          <Chessboard game={game} boardWidth={560} showCoordinates={true} highlightLastMove={true} />
        </main>

        <aside className="w-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <GameStopNotification 
              reason={gameStopReason}
              onReset={resetGame}
            />
            {/* Rate limit notification removed */}
            <GameStatus 
              game={game} 
              moveTimes={moveTimes} 
              currentMoveStart={currentMoveStart} 
              currentThinkingAgent={currentThinkingAgent}
              isThinking={isThinking} 
            />
          </div>
        </aside>
      </div>

      <MatchStatus
        agent1={agent1}
        agent2={agent2}
        isPlaying={isPlaying}
        moveNumber={moveNumber}
        currentTurn={currentTurn}
        speed={speed}
        result={result}
        onPlayPause={togglePlayPause}
        onReset={resetGame}
        onSpeedChange={cycleSpeed}
      />
    </div>
  );
};

export default Index;
