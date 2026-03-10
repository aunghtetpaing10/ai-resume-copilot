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
          {/* Dashboard cards will go here */}
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow">
            <h3 className="font-semibold leading-none tracking-tight mb-2">Resumes</h3>
            <p className="text-sm text-muted-foreground">You haven't created any resumes yet.</p>
            <Button className="mt-4 w-full">Create Resume</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
