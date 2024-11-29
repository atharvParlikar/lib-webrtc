import { useWebRTC } from "./hooks/useWebRTC";

function App() {
  const { candidates } = useWebRTC();

  return (
    <div>
      <h2>ICE Candidates:</h2>
      {candidates.map((candidate, index) => (
        <div key={index}>{JSON.stringify(candidate)}</div>
      ))}
    </div>
  );
}

export default App;
