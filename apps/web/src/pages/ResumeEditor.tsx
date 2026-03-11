import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Resume, ResumeContent } from '@ai-resume-copilot/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';

export default function ResumeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [resume, setResume] = useState<Resume | null>(null);
  const [title, setTitle] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) fetchResume(id);
  }, [id]);

  const fetchResume = async (resumeId: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.resumes.get(resumeId);
      setResume(data);
      setTitle(data.title);
      setJsonContent(JSON.stringify(data.content, null, 2));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch resume');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      setError('');
      
      let parsedContent: ResumeContent;
      try {
        parsedContent = JSON.parse(jsonContent);
      } catch (e) {
        throw new Error('Invalid JSON format in the content area.');
      }

      await api.resumes.update(id, {
        title,
        content: parsedContent
      });
      // Optionally show a success toast here
    } catch (err: any) {
      setError(err.message || 'Failed to save resume');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/resumes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-3xl font-bold tracking-tight">Edit Resume</div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none mb-2 block">
                Resume Title
              </label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Software Engineer 2024"
              />
            </div>
            
            {resume?.source_file_path && (
              <div className="pt-4 border-t">
                 <p className="text-sm text-muted-foreground mb-2">
                   This resume was parsed from an uploaded document.
                 </p>
                 <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    Source: {resume.source_file_path.split('/').pop()}
                 </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Structured Content (JSON)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
               Edit the raw JSON structure of your resume. In future updates, this will be replaced with a rich visual editor.
            </p>
            <Textarea 
              className="font-mono text-sm min-h-[500px]"
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
