import { Calendar } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Calendar aria-hidden className="size-10" />
      <h1 className="text-3xl font-semibold">Arrangly</h1>
    </main>
  );
}
