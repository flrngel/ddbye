import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from '@/pages/Landing';
import ConsolePage from '@/pages/Console';
import { AppProvider } from '@/store/AppContext';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/console" element={<ConsolePage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
