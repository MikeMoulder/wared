"use client";

import dynamic from "next/dynamic";

// The app is date- and localStorage-driven, so render it in the browser only.
const App = dynamic(() => import("@/components/App"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-paper" />,
});

export default function Page() {
  return <App />;
}
