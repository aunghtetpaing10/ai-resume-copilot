import { FastifyInstance, FastifyRequest } from "fastify";
import { createAuthClient } from "../lib/supabase";
import { GeminiProvider } from "../services/ai/gemini-provider";

let _ai: GeminiProvider | null = null;
function getAI(): GeminiProvider {
  if (!_ai) _ai = new GeminiProvider();
  return _ai;
}

export default async function (fastify: FastifyInstance) {
  fastify.addHook("preValidation", fastify.authenticate);

  /**
   * POST /api/v1/ai/parse
   * Parse raw resume text into structured ResumeContent
   */
  fastify.post(
    "/parse",
    async (request: FastifyRequest<{ Body: { rawText: string } }>, reply) => {
      const { rawText } = request.body;
      if (!rawText || typeof rawText !== "string") {
        return reply.code(400).send({ error: "rawText is required" });
      }

      try {
        const content = await getAI().parseResume(rawText);
        return { content };
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "AI parsing failed" });
      }
    },
  );

  /**
   * POST /api/v1/ai/tailor
   * Tailor a resume to a job description
   */
  fastify.post(
    "/tailor",
    async (
      request: FastifyRequest<{
        Body: { resumeId: string; jobDescription: string };
      }>,
      reply,
    ) => {
      const userId = request.user?.id;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const { resumeId, jobDescription } = request.body;
      if (!resumeId || !jobDescription) {
        return reply
          .code(400)
          .send({ error: "resumeId and jobDescription are required" });
      }

      const token = request.headers.authorization?.replace("Bearer ", "");
      const authClient = token ? createAuthClient(token) : null;
      if (!authClient) return reply.code(401).send({ error: "Unauthorized" });

      // Fetch the resume
      const { data: resume, error } = await authClient
        .from("resumes")
        .select("content")
        .eq("id", resumeId)
        .eq("user_id", userId)
        .single();

      if (error || !resume) {
        return reply.code(404).send({ error: "Resume not found" });
      }

      try {
        const content = await getAI().tailorResume(
          resume.content,
          jobDescription,
        );
        return { content };
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "AI tailoring failed" });
      }
    },
  );

  /**
   * POST /api/v1/ai/score
   * Score a resume for ATS compatibility against a job description
   */
  fastify.post(
    "/score",
    async (
      request: FastifyRequest<{
        Body: { resumeId: string; jobDescription: string };
      }>,
      reply,
    ) => {
      const userId = request.user?.id;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });

      const { resumeId, jobDescription } = request.body;
      if (!resumeId || !jobDescription) {
        return reply
          .code(400)
          .send({ error: "resumeId and jobDescription are required" });
      }

      const token = request.headers.authorization?.replace("Bearer ", "");
      const authClient = token ? createAuthClient(token) : null;
      if (!authClient) return reply.code(401).send({ error: "Unauthorized" });

      const { data: resume, error } = await authClient
        .from("resumes")
        .select("content")
        .eq("id", resumeId)
        .eq("user_id", userId)
        .single();

      if (error || !resume) {
        return reply.code(404).send({ error: "Resume not found" });
      }

      try {
        const result = await getAI().scoreATS(resume.content, jobDescription);
        return result;
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: "AI scoring failed" });
      }
    },
  );
}
