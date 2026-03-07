import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SimulationPage from "./pages/StimulationPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/simulation" element={<SimulationPage />} />
    </Routes>
  );
}