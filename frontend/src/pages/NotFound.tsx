import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">LexLearn Academy</p>
        <h1 className="mb-3 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">That page is not part of this course map.</p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-90"
        >
          Back to learn hub
        </a>
      </div>
    </div>
  );
};

export default NotFound;
