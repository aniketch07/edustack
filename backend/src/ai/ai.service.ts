import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateMcqDto } from './dto/generate-mcq.dto';

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';

// Gemini's OpenAI-compatible endpoint — much faster than the NVIDIA free tier.
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'; // change to any Gemini model you have access to

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  // Selected provider: Gemini if configured, else NVIDIA.
  // Preference order: GEMINI_API_KEY first (faster), then NVIDIA_NIM_API_KEY.
  private readonly provider: 'gemini' | 'nvidia' | 'none';
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const geminiKey =
      this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const nvidiaKey =
      this.configService.get<string>('NVIDIA_NIM_API_KEY') || process.env.NVIDIA_NIM_API_KEY || '';

    if (geminiKey) {
      this.provider = 'gemini';
      this.apiKey = geminiKey;
      this.model =
        this.configService.get<string>('GEMINI_MODEL') || process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
    } else if (nvidiaKey) {
      this.provider = 'nvidia';
      this.apiKey = nvidiaKey;
      this.model =
        this.configService.get<string>('NVIDIA_NIM_MODEL') || process.env.NVIDIA_NIM_MODEL || DEFAULT_MODEL;
    } else {
      this.provider = 'none';
      this.apiKey = '';
      this.model = '';
    }
  }

  /** The active provider's name (for logging / UI). */
  getProvider(): string {
    return this.provider;
  }

  /** Returns true when an AI provider is configured. */
  isConfigured(): boolean {
    return this.provider !== 'none';
  }

  /**
   * Generate MCQ questions from topics using NVIDIA NIM (OpenAI-compatible API).
   * The model is prompted to return strict JSON, which we validate + parse.
   */
  async generateMcq(dto: GenerateMcqDto): Promise<GeneratedQuestion[]> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'AI is not configured. Set GEMINI_API_KEY (or NVIDIA_NIM_API_KEY) in the backend .env to enable AI question generation.',
      );
    }

    const { topics, count, difficulty = 'mix' } = dto;

    const systemPrompt = `You are an expert MCQ question writer for JEE/NEET coaching institutes. Create ${count} high-quality multiple-choice questions about the topic(s): ${topics}.

Rules:
- Each question must have EXACTLY 4 options labeled A, B, C, D.
- The correct answer is the index (0-3) of the right option.
- Questions should be exam-appropriate and pedagogically sound.
- Include a brief explanation for each question (1-2 sentences).
- Difficulty: ${difficulty === 'mix' ? 'mix of easy, medium, and hard' : difficulty}.

Respond with STRICT JSON only — an array of objects with this exact shape, no markdown, no extra text:
[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."}]`;

    const baseUrl = this.provider === 'gemini' ? GEMINI_BASE_URL : NIM_BASE_URL;
    this.logger.log(`Generating MCQ via ${this.provider} (model: ${this.model})`);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate ${count} MCQ questions on: ${topics}` },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`NIM API error ${response.status}: ${errText.slice(0, 300)}`);
        throw new BadRequestException('AI generation failed. Please try again.');
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('AI returned an empty response.');
      }

      return this.parseQuestions(content, count);
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(`AI generateMcq error: ${e.message}`);
      throw new BadRequestException('AI generation failed. Please try again.');
    }
  }

  /** Robustly parse the model output into a validated question array. */
  private parseQuestions(content: string, expected: number): GeneratedQuestion[] {
    // Strip markdown fences if the model wrapped output in ```json ... ```
    let json = content.trim();
    const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) json = fenceMatch[1].trim();

    let parsed: any[];
    try {
      parsed = JSON.parse(json);
    } catch {
      // Attempt to find the first [ ... ] array block
      const start = json.indexOf('[');
      const end = json.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) {
        throw new BadRequestException('AI returned unparseable output. Try regenerating.');
      }
      try {
        parsed = JSON.parse(json.slice(start, end + 1));
      } catch {
        throw new BadRequestException('AI returned unparseable output. Try regenerating.');
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BadRequestException('AI returned no questions. Try regenerating.');
    }

    const questions: GeneratedQuestion[] = [];
    for (const q of parsed) {
      const questionText = String(q?.question || '').trim();
      if (!questionText) continue;

      // Require at least 2 real, non-empty options (the model sometimes emits blanks)
      const rawOptions = Array.isArray(q?.options) ? q.options : [];
      const options = rawOptions.map((o: any) => String(o || '').trim()).filter((o) => o.length > 0);
      if (options.length < 2) continue;

      questions.push({
        question: questionText,
        options,
        correctAnswer: typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q?.explanation ? String(q.explanation).trim() : undefined,
      });
    }

    if (questions.length === 0) {
      throw new BadRequestException('AI generated no valid questions. Try regenerating.');
    }

    return questions;
  }
}
