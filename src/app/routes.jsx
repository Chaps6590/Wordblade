import { MainMenu } from '../pages/MainMenu.jsx'
import { ScenarioSelect } from '../pages/ScenarioSelect.jsx'
import { BattlePage } from '../pages/BattlePage.jsx'
import { ResultPage } from '../pages/ResultPage.jsx'
import { MultiplayerPage } from '../pages/MultiplayerPage.jsx'

export const routes = [
  { path: '/', element: <MainMenu /> },
  { path: '/scenarios', element: <ScenarioSelect /> },
  { path: '/battle/:scenarioId', element: <BattlePage /> },
  { path: '/result', element: <ResultPage /> },
  { path: '/multiplayer', element: <MultiplayerPage /> }
]
