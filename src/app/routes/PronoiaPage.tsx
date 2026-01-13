import { Swords } from 'lucide-react';

export function PronoiaPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-athena-text">
      <Swords className="w-24 h-24 mb-6 text-athena-muted" />
      <h1 className="text-3xl font-bold mb-2">Pronoia</h1>
      <h2 className="text-xl text-athena-muted mb-4">Strategy & Planning</h2>
      <p className="text-athena-muted text-center max-w-md">
        Strategic thinking and decision-making
      </p>
    </div>
  );
}
