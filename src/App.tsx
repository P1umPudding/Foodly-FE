import { Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@postxl/ui-components';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </TooltipProvider>
  );
}
