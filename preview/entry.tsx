import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { NavCtx } from "./shims/router";
import Landing from "@/components/landing/Landing";
import Shell from "@/components/app/Shell";
import Profile from "@/components/app/Profile";
import Home from "@/app/(app)/home/page";
import Discover from "@/app/(app)/discover/page";
import Studio from "@/app/(app)/studio/page";
import Bounties from "@/app/(app)/bounties/page";
import Squad from "@/app/(app)/squad/page";
import Splits from "@/app/(app)/splits/page";

const PAGES: Record<string, () => React.ReactNode> = {
  "/home": () => <Home />,
  "/discover": () => <Discover />,
  "/studio": () => <Studio />,
  "/bounties": () => <Bounties />,
  "/squad": () => <Squad />,
  "/splits": () => <Splits />,
};

function App() {
  const [href, setHref] = useState("/");
  const go = useCallback((h: string) => {
    setHref(h);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("lenis", false);
  }, [href]);
  const [path, qs] = href.split("?");
  const query = new URLSearchParams(qs ?? "");
  let page: React.ReactNode;
  if (path === "/") page = <Landing />;
  else if (path.startsWith("/u/")) page = <Shell><Profile id={path.slice(3)} /></Shell>;
  else page = <Shell>{(PAGES[path] ?? PAGES["/home"])()}</Shell>;
  return (
    <NavCtx.Provider value={{ path, query, go }}>
      <div key={path === "/" ? "landing" : "app"}>{page}</div>
    </NavCtx.Provider>
  );
}

createRoot(document.getElementById("yard")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
