import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { NotFound } from './pages/NotFound';
import { CatalogProvider } from './catalog/CatalogProvider';
import { RecipeList } from './pages/RecipeList';
import { RecipeDetail } from './pages/RecipeDetail';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Nav />
      <main className="flex-1">
        <CatalogProvider>
          <Routes>
            <Route path="/" element={<RecipeList />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CatalogProvider>
      </main>
      <Footer />
    </div>
  );
}
