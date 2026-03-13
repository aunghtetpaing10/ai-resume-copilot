import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Resume, ResumeContent } from '@ai-resume-copilot/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Wand2, Target, ChevronDown, ChevronUp } from 'lucide-react';

export default function ResumeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [resume, setResume] = useState<Resume | null>(null);
  const [title, setTitle] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // AI state
  const [jobDescription, setJobDescription] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [atsScore, setAtsScore] = useState<{ score: number; feedback: string[] } | null>(null);

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
      } catch (_e) {
        throw new Error('Invalid JSON format in the content area.');
      }

      await api.resumes.update(id, {
        title,
        content: parsedContent
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save resume');
    } finally {
      setSaving(false);
    }
  };

  const handleTailor = async () => {
    if (!id || !jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }
    try {
      setTailoring(true);
      setError('');
      const tailoredContent = await api.ai.tailor(id, jobDescription);
      setJsonContent(JSON.stringify(tailoredContent, null, 2));
    } catch (err: any) {
      setError(err.message || 'AI tailoring failed');
    } finally {
      setTailoring(false);
    }
  };

  const handleScore = async () => {
    if (!id || !jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }
    try {
      setScoring(true);
      setError('');
      const result = await api.ai.score(id, jobDescription);
      setAtsScore(result);
    } catch (err: any) {
      setError(err.message || 'AI scoring failed');
    } finally {
      setScoring(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metadata + AI Panel */}
        <div className="space-y-6">
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

          {/* AI Tools Panel */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setAiPanelOpen(!aiPanelOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-500" />
                  AI Tools
                </CardTitle>
                {aiPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {aiPanelOpen && (
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium leading-none mb-2 block">
                    Job Description
                  </label>
                  <Textarea
                    className="min-h-[200px] text-sm"
                    placeholder="Paste the target job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleTailor}
                    disabled={tailoring || !jobDescription.trim()}
                  >
                    {tailoring ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Tailoring...</>
                    ) : (
                      <><Target className="h-4 w-4 mr-2" /> Tailor</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleScore}
                    disabled={scoring || !jobDescription.trim()}
                  >
                    {scoring ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" /> Scoring...</>
                    ) : (
                      'ATS Score'
                    )}
                  </Button>
                </div>

                {/* ATS Score Result */}
                {atsScore && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ATS Score</span>
                      <span className={`text-2xl font-bold ${
                        atsScore.score >= 80 ? 'text-green-600' :
                        atsScore.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {atsScore.score}/100
                      </span>
                    </div>
                    {/* Score progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          atsScore.score >= 80 ? 'bg-green-500' :
                          atsScore.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${atsScore.score}%` }}
                      />
                    </div>
                    {atsScore.feedback.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Feedback</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {atsScore.feedback.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-muted-foreground/50">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column: JSON Editor */}
        <Card className="lg:col-span-2">
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
