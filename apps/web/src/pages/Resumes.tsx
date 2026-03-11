import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Resume } from '@ai-resume-copilot/shared-types';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Upload, FileText, Trash2, Edit 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const data = await api.resumes.list();
      setResumes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlank = async () => {
    try {
      setLoading(true);
      const newResume = await api.resumes.create({ title: 'Untitled Resume' });
      navigate(`/resumes/${newResume.id}/edit`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      setUploading(true);
      setError('');
      const newResume = await api.resumes.upload(file);
      navigate(`/resumes/${newResume.id}/edit`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    
    try {
      setLoading(true);
      await api.resumes.delete(id);
      setResumes(resumes.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Resumes</h1>
          <p className="text-muted-foreground mt-2">Manage your resumes and create new variations.</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleCreateBlank} disabled={loading || uploading}>
            <Plus className="mr-2 h-4 w-4" /> Create Blank
          </Button>
          <div className="relative">
            <Input 
              type="file" 
              accept=".pdf,.docx" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={loading || uploading}
            />
            <Button variant="outline" disabled={loading || uploading}>
              {uploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload Document
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {loading && !resumes.length ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : resumes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-lg font-medium">No resumes found</div>
            <p className="text-sm text-muted-foreground mt-1 mb-4">You haven't created or uploaded any resumes yet.</p>
            <Button onClick={handleCreateBlank}>Create Your First Resume</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map(resume => (
            <Card key={resume.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-1">{resume.title}</CardTitle>
                <CardDescription>
                  Updated on {new Date(resume.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {resume.is_base ? (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Base Resume</span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Tailored</span>
                )}
                {resume.source_file_path && (
                   <span className="ml-2 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 border border-gray-200 shadow-sm">Uploaded Source</span>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4 bg-muted/20">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/resumes/${resume.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(resume.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
