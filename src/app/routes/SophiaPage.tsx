import { Bird } from 'lucide-react';

export function SophiaPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-athena-text">
      <Bird className="w-24 h-24 mb-6 text-athena-muted" />
      <h1 className="text-3xl font-bold mb-2">Sophia</h1>
      <h2 className="text-xl text-athena-muted mb-4">Knowledge & Wisdom</h2>
      <p className="text-athena-muted text-center max-w-md">
        Your validated knowledge workspace
      </p>
    </div>
  );
}
