import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Results } from "./pages/Results";

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Restore deep links from GitHub Pages 404 redirects
    const redirectPath = sessionStorage.getItem("ghpages_redirect_path");
    const redirectSearch = sessionStorage.getItem("ghpages_redirect_search");
    if (redirectPath) {
      sessionStorage.removeItem("ghpages_redirect_path");
      sessionStorage.removeItem("ghpages_redirect_search");
      
      const fullUrl = redirectPath + (redirectSearch || "");
      window.history.replaceState({}, "", fullUrl);
      const pathPart = redirectPath.split("?")[0];
      setCurrentPath(pathPart);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleNavigate = (newUrl: string) => {
    window.history.pushState({}, "", newUrl);
    // Extract path part (before '?')
    const pathPart = newUrl.split("?")[0];
    setCurrentPath(pathPart);
  };

  // Render Results if pathname ends with "/results", else Home
  const isResultsPage = currentPath.endsWith("/results") || currentPath.endsWith("/results/");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {isResultsPage ? (
        <Results onNavigate={handleNavigate} />
      ) : (
        <Home onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
