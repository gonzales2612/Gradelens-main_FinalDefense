import { useEffect } from "react";
import { AppRouter } from "./router";
import { useAuthStore } from "@/features/auth";

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <AppRouter />;
}

export default App;
