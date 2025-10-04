import { useState } from "react";
import { Header } from "@/components/Header";
import { Chessboard } from "@/components/Chessboard";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchStatus } from "@/components/MatchStatus";
import { AGENTS } from "@/data/agents";
import { useChessMatch } from "@/hooks/useChessMatch";
import { useApiKeys } from "@/hooks/useApiKeys";
import { Agent } from "@/types/chess";

const Index = () => {
  const [agent1, setAgent1] = useState<Agent | null>(AGENTS[0]);
  const [agent2, setAgent2] = useState<Agent | null>(AGENTS[1]);
  const { apiKeys, updateApiKey } = useApiKeys();
  const { game, isPlaying, speed, result, togglePlayPause, resetGame, cycleSpeed } =
    useChessMatch(agent1, agent2, apiKeys);

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
        onUpdateApiKey={updateApiKey}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex items-center justify-center overflow-hidden">
          <Chessboard game={game} boardWidth={560} />
        </main>

        <aside className="w-96">
          <Leaderboard agents={AGENTS} />
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
