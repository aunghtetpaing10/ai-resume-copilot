import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow col-span-1 md:col-span-2 lg:col-span-3">
            <h3 className="font-semibold leading-none tracking-tight mb-2">My Resumes</h3>
            <p className="text-sm text-muted-foreground">Manage your resumes, upload documents, and edit them.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/resumes'}>Go to Resumes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
