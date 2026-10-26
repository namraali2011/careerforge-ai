
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  FileText,
  BriefcaseBusiness,
  GraduationCap,
  Code2,
  UserRound,
  Download,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Target,
  LayoutTemplate,
  Save,
  ArrowRight,
  WandSparkles,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import { initialResume, type Resume } from "../lib/resume";
import ResumePreview, {
  type TemplateType,
} from "../components/ResumePreview";

type Tab = "personal" | "experience" | "education" | "skills";
type AIAction = "summary" | "experience" | "analyze";

const tabs: {
  id: Tab;
  label: string;
  icon: typeof UserRound;
}[] = [
  { id: "personal", label: "Personal Details", icon: UserRound },
  { id: "experience", label: "Experience", icon: BriefcaseBusiness },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills & Projects", icon: Code2 },
];

const fields: Record<
  Tab,
  { key: keyof Resume; label: string; multiline?: boolean }[]
> = {
  personal: [
    { key: "name", label: "Full Name" },
    { key: "title", label: "Professional Title" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number" },
    { key: "location", label: "Location" },
    {
      key: "summary",
      label: "Professional Summary",
      multiline: true,
    },
  ],
  experience: [
    {
      key: "experience",
      label: "Work Experience",
      multiline: true,
    },
  ],
  education: [
    {
      key: "education",
      label: "Education",
      multiline: true,
    },
  ],
  skills: [
    {
      key: "skills",
      label: "Skills (comma separated)",
      multiline: true,
    },
    {
      key: "projects",
      label: "Projects",
      multiline: true,
    },
  ],
};

const templates: {
  id: TemplateType;
  name: string;
  description: string;
  preview: string;
}[] = [
  {
    id: "executive",
    name: "Executive",
    description: "Formal & professional",
    preview: "bg-white",
  },
  {
    id: "atelier",
    name: "Atelier",
    description: "Editorial & elegant",
    preview: "bg-[#F9F6F0]",
  },
  {
    id: "signature",
    name: "Signature",
    description: "Bold & distinctive",
    preview: "bg-[#222329]",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean & ATS-friendly",
    preview: "bg-[#F2F0F4]",
  },
];

function matchKeywords(resume: Resume, job: string) {
  const stopWords = new Set([
    "and", "the", "for", "with", "you", "your", "our",
    "are", "this", "that", "will", "from", "have",
    "has", "all", "into", "their", "about", "able",
    "work", "working", "role", "team", "years",
    "experience", "required", "preferred", "skills",
    "candidate", "responsibilities", "including",
    "strong", "good", "excellent", "must", "such",
    "using", "knowledge", "ability", "other",
  ]);

  const tokenize = (value: string) =>
    (value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || [])
      .filter((word) => !stopWords.has(word));

  const jobWords = Array.from(new Set(tokenize(job)));

  const resumeWords = new Set(
    tokenize(
      [
        resume.title,
        resume.summary,
        resume.experience,
        resume.education,
        resume.skills,
        resume.projects,
      ].join(" ")
    )
  );

  const matched = jobWords.filter((word) =>
    resumeWords.has(word)
  );

  const missing = jobWords.filter(
    (word) => !resumeWords.has(word)
  );

  return {
    score: jobWords.length
      ? Math.round((matched.length / jobWords.length) * 100)
      : 0,
    matched,
    missing,
    total: jobWords.length,
  };
}

export default function Home() {
  const [resume, setResume] = useState<Resume>(initialResume);
  const [tab, setTab] = useState<Tab>("personal");

  const [template, setTemplate] =
    useState<TemplateType>("executive");

  const [job, setJob] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState<AIAction | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mounted, setMounted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  // Load existing resume from local storage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "careerforge_resume"
      );
      const savedTemplate = localStorage.getItem(
        "careerforge_template"
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed && typeof parsed === "object") {
          const safeResume = { ...initialResume };

          for (const key of Object.keys(
            initialResume
          ) as (keyof Resume)[]) {
            if (typeof parsed[key] === "string") {
              safeResume[key] = parsed[key];
            }
          }

          setResume(safeResume);
        }
      }

      if (
        savedTemplate === "executive" ||
        savedTemplate === "atelier" ||
        savedTemplate === "signature" ||
        savedTemplate === "minimal"
      ) {
        setTemplate(savedTemplate);
      }
    } catch {
      // Continue with sample data when local storage fails.
    }

    setMounted(true);
  }, []);

  // Save changes automatically.
  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem(
        "careerforge_resume",
        JSON.stringify(resume)
      );

      localStorage.setItem(
        "careerforge_template",
        template
      );
    } catch {
      // Browser storage may be unavailable.
    }
  }, [resume, template, mounted]);

  const matching = useMemo(
    () => matchKeywords(resume, job),
    [resume, job]
  );

  const update = (
    key: keyof Resume,
    value: string
  ) => {
    setResume((old) => ({
      ...old,
      [key]: value,
    }));

    setAnalysis("");
    setNotice("");
  };

  async function runAI(action: AIAction) {
    setError("");
    setNotice("");

    const content =
      action === "summary"
        ? resume.summary
        : action === "experience"
        ? resume.experience
        : JSON.stringify(resume);

    if (!content.trim()) {
      setError(
        "Please enter your resume information first."
      );
      return;
    }

    if (action === "analyze" && !job.trim()) {
      setError(
        "Please paste a job description before analyzing."
      );
      return;
    }

    setLoading(action);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          content,
          job,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      if (action === "summary") {
        update("summary", data.result);
        setNotice(
          "Your professional summary has been improved."
        );
      } else if (action === "experience") {
        update("experience", data.result);
        setNotice(
          "Your experience section has been improved."
        );
      } else {
        setAnalysis(data.result);
        setNotice(
          "AI job match analysis completed."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI request failed."
      );
    } finally {
      setLoading(null);
    }
  }

  function reset() {
    const confirmed = window.confirm(
      "Reset your resume to the sample data? This will replace your current information."
    );

    if (!confirmed) return;

    setResume(initialResume);
    setJob("");
    setAnalysis("");
    setError("");
    setNotice("Sample resume restored.");
  }

  function printResume() {
    window.print();
  }

  const wordCount = [
    resume.summary,
    resume.experience,
    resume.education,
    resume.skills,
    resume.projects,
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#25252B]">
      {/* Mobile overlay */}
      {mobileMenu && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
          className="no-print fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#15171D] p-7 text-white transition-transform lg:translate-x-0 ${
          mobileMenu
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C7A977] text-[#15171D]">
              <FileText size={25} />
            </div>

            <div>
              <div className="text-xl font-black tracking-tight">
                CareerForge
              </div>

              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C7A977]">
                AI Resume Studio
              </div>
            </div>
          </div>

          <button
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
            className="lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-14 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Your Workspace
        </div>

        <nav
          className="mt-6 space-y-3"
          aria-label="Resume sections"
        >
          {tabs.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setMobileMenu(false);
                }}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left text-sm font-semibold transition ${
                  tab === item.id
                    ? "bg-[#C7A977] text-[#15171D]"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />

                <span className="flex-1">
                  {item.label}
                </span>

                {tab === item.id && (
                  <ChevronRight size={16} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C7A977]/15 text-[#C7A977]">
            <Sparkles size={22} />
          </div>

          <h3 className="mt-5 text-lg font-bold">
            Your AI career partner
          </h3>

          <p className="mt-3 text-xs leading-6 text-slate-400">
            Transform your experience into a stronger,
            more compelling resume using Gemini AI.
          </p>

          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#C7A977]">
            <ShieldCheck size={15} />
            AI-powered writing
          </div>
        </div>

        <div className="mt-auto pt-8 text-xs text-slate-500">
          CareerForge AI · Version 1.1
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="no-print sticky top-0 z-20 flex min-h-24 items-center justify-between gap-4 border-b border-[#E8E3DB] bg-[#F7F5F0]/95 px-5 backdrop-blur-xl md:px-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
              className="lg:hidden"
            >
              <Menu size={25} />
            </button>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A8160]">
                CareerForge Workspace
              </p>

              <h1 className="mt-1 text-xl font-black tracking-tight md:text-2xl">
                Resume Builder
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-2 text-xs font-semibold text-[#627866] sm:flex">
              <CheckCircle2 size={16} />
              Saved locally
            </div>

            <button
              onClick={printResume}
              className="flex items-center gap-2 rounded-xl bg-[#49364B] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#DDD1DA] transition hover:bg-[#352738] md:px-6"
            >
              <Download size={17} />
              <span className="hidden sm:inline">
                Export Resume
              </span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </header>

        {/* Introduction */}
        <div className="no-print mx-auto max-w-[1700px] px-5 pt-10 md:px-10">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#A18760]">
                <Sparkles size={15} />
                Craft your next opportunity
              </div>

              <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">
                Your story.
                <span className="text-[#9B805E]">
                  {" "}
                  Beautifully told.
                </span>
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736E]">
                Create a distinctive professional resume,
                improve your writing with AI, and tailor
                your experience to the opportunities
                that matter.
              </p>
            </div>

            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-xl border border-[#E4DFD7] bg-white px-5 py-3 text-sm font-semibold text-[#625E58] transition hover:border-[#C7A977]"
            >
              <RotateCcw size={16} />
              Reset Sample
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800"
            >
              {notice}
            </div>
          )}
        </div>

        {/* Workspace Grid */}
        <div className="mx-auto grid max-w-[1700px] gap-10 px-5 pb-16 md:px-10 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* Left editor */}
          <section className="no-print min-w-0 space-y-9">
            {/* Resume Information */}
            <div className="rounded-3xl border border-[#E7E2DA] bg-white p-6 shadow-sm md:p-9">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#B19A7C]">
                    Step 01 / Build
                  </p>

                  <h3 className="text-xl font-extrabold tracking-tight">
                    Resume Information
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#88827B]">
                    Tell your professional story.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F1EAF1] p-4 text-[#49364B]">
                  <FileText size={21} />
                </div>
              </div>

              {/* Section tabs */}
              <div className="mb-8 grid grid-cols-2 gap-3">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${
                      tab === item.id
                        ? "border-[#49364B] bg-[#49364B] text-white"
                        : "border-[#ECE8E2] bg-[#FAF9F6] text-[#77716A] hover:border-[#C7A977]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Fields */}
              <div className="space-y-7">
                {fields[tab].map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={field.key}
                      className="mb-3 block text-sm font-bold text-[#423D39]"
                    >
                      {field.label}
                    </label>

                    {field.multiline ? (
                      <textarea
                        id={field.key}
                        value={resume[field.key]}
                        onChange={(e) =>
                          update(
                            field.key,
                            e.target.value
                          )
                        }
                        rows={
                          field.key === "experience"
                            ? 13
                            : field.key === "summary"
                            ? 6
                            : 7
                        }
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full rounded-xl border border-[#E9E5DE] bg-[#FAF9F6] px-5 py-4 text-sm leading-7 text-[#312E2B] outline-none transition focus:border-[#9C7C93] focus:bg-white focus:ring-2 focus:ring-[#F1EAF1]"
                      />
                    ) : (
                      <input
                        id={field.key}
                        type="text"
                        value={resume[field.key]}
                        onChange={(e) =>
                          update(
                            field.key,
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-[#E9E5DE] bg-[#FAF9F6] px-5 py-4 text-sm text-[#312E2B] outline-none transition focus:border-[#9C7C93] focus:bg-white focus:ring-2 focus:ring-[#F1EAF1]"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* AI improvement buttons */}
              {tab === "personal" && (
                <button
                  disabled={loading !== null}
                  onClick={() => runAI("summary")}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#F1EAF1] px-5 py-4 text-sm font-bold text-[#49364B] transition hover:bg-[#E7DBE7] disabled:opacity-50"
                >
                  {loading === "summary" ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <WandSparkles size={18} />
                  )}
                  Improve Summary with Gemini
                </button>
              )}

              {tab === "experience" && (
                <button
                  disabled={loading !== null}
                  onClick={() => runAI("experience")}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#F1EAF1] px-5 py-4 text-sm font-bold text-[#49364B] transition hover:bg-[#E7DBE7] disabled:opacity-50"
                >
                  {loading === "experience" ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <WandSparkles size={18} />
                  )}
                  Improve Experience with Gemini
                </button>
              )}

              <div className="mt-8 flex items-center gap-2 border-t border-[#F0EBE5] pt-6 text-xs text-[#928C84]">
                <Save size={15} />
                Your changes are saved in this browser.
              </div>
            </div>

            {/* Job Match Analyzer */}
            <div className="rounded-3xl border border-[#E7E2DA] bg-white p-6 shadow-sm md:p-9">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#F1EAF1] p-4 text-[#49364B]">
                  <Target size={22} />
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#B19A7C]">
                    Step 02 / Optimize
                  </p>

                  <h3 className="text-xl font-extrabold">
                    AI Job Match
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#88827B]">
                    Discover how well your resume
                    aligns with your next opportunity.
                  </p>
                </div>
              </div>

              <label
                htmlFor="job-description"
                className="mt-9 mb-3 block text-sm font-bold text-[#423D39]"
              >
                Target Job Description
              </label>

              <textarea
                id="job-description"
                value={job}
                onChange={(e) => {
                  setJob(e.target.value);
                  setAnalysis("");
                }}
                maxLength={12000}
                rows={8}
                placeholder="Paste the job description you want to apply for..."
                className="w-full rounded-xl border border-[#E9E5DE] bg-[#FAF9F6] px-5 py-4 text-sm leading-7 outline-none focus:border-[#9C7C93] focus:ring-2 focus:ring-[#F1EAF1]"
              />

              {job.trim() && (
                <div className="mt-7 rounded-2xl border border-[#EDE7DE] bg-[#FAF9F6] p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#938B82]">
                        Keyword Overlap
                      </p>

                      <p className="mt-3 text-4xl font-black text-[#49364B]">
                        {matching.score}%
                      </p>
                    </div>

                    <p className="text-xs text-[#8A837C]">
                      {matching.matched.length}/
                      {matching.total} terms
                    </p>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#E9E1E8]">
                    <div
                      className="h-full rounded-full bg-[#49364B] transition-all"
                      style={{
                        width: `${matching.score}%`,
                      }}
                    />
                  </div>

                  <p className="mt-4 text-xs leading-6 text-[#8C857E]">
                    This is a simple keyword comparison,
                    not an official ATS compatibility score.
                  </p>

                  {matching.missing.length > 0 && (
                    <div className="mt-6">
                      <p className="mb-3 text-xs font-bold">
                        Keywords Not Found
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {matching.missing
                          .slice(0, 12)
                          .map((word) => (
                            <span
                              key={word}
                              className="rounded-lg border border-[#E8E1D9] bg-white px-3 py-1.5 text-xs text-[#625B54]"
                            >
                              {word}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                disabled={
                  loading !== null || !job.trim()
                }
                onClick={() => runAI("analyze")}
                className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-[#15171D] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#33343A] disabled:opacity-50"
              >
                {loading === "analyze" ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={18} />
                )}

                Analyze with Gemini
                <ArrowRight size={17} />
              </button>

              {analysis && (
                <div className="mt-7 rounded-2xl border border-[#DED3DE] bg-[#F8F4F8] p-6">
                  <h4 className="mb-4 font-bold text-[#49364B]">
                    AI Review & Recommendations
                  </h4>

                  <div className="whitespace-pre-wrap text-sm leading-8 text-[#514B50]">
                    {analysis}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right Preview */}
          <section className="min-w-0">
            <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#B19A7C]">
                  Step 03 / Design
                </p>

                <h3 className="flex items-center gap-3 text-xl font-extrabold">
                  <LayoutTemplate
                    size={21}
                    className="text-[#49364B]"
                  />
                  Live Resume Preview
                </h3>

                <p className="mt-2 text-sm text-[#88827B]">
                  Select a template and preview
                  your resume instantly.
                </p>
              </div>
            </div>

            {/* Template Gallery */}
            <div className="no-print mb-7 rounded-3xl border border-[#E7E2DA] bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h4 className="text-sm font-extrabold">
                  Choose Your Template
                </h4>

                <span className="rounded-full bg-[#F2EEE8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9A8160]">
                  4 designs
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {templates.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setTemplate(item.id)
                    }
                    aria-pressed={template === item.id}
                    className={`group rounded-xl border p-2 text-left transition-all ${
                      template === item.id
                        ? "border-[#C7A977] bg-[#F8F3EB] shadow-md"
                        : "border-[#ECE7DF] hover:border-[#C7A977]"
                    }`}
                  >
                    <div
                      className={`relative mb-3 flex h-20 items-center justify-center overflow-hidden rounded-lg ${item.preview}`}
                    >
                      {item.id === "signature" && (
                        <div className="absolute inset-y-0 left-0 w-1/3 bg-[#35363D]" />
                      )}

                      <div
                        className={`relative z-10 w-10 space-y-1 ${
                          item.id === "signature"
                            ? "ml-3"
                            : ""
                        }`}
                      >
                        <div className="h-1 w-full rounded bg-[#C7A977]" />
                        <div className="h-0.5 w-4/5 rounded bg-[#C6C0B8]" />
                        <div className="h-0.5 w-full rounded bg-[#C6C0B8]" />
                        <div className="h-0.5 w-3/4 rounded bg-[#C6C0B8]" />
                      </div>

                      {template === item.id && (
                        <div className="absolute right-1.5 top-1.5 rounded-full bg-[#C7A977] p-1 text-white">
                          <CheckCircle2 size={11} />
                        </div>
                      )}
                    </div>

                    <div className="px-1 pb-1">
                      <p className="text-xs font-extrabold capitalize">
                        {item.name}
                      </p>

                      <p className="mt-1 text-[10px] leading-4 text-[#938C85]">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resume document */}
            <div className="print-area overflow-hidden rounded-2xl border border-[#E5DFD7] bg-white shadow-xl shadow-[#DCD5CB]/40">
              <ResumePreview
                resume={resume}
                template={template}
              />
            </div>

            {/* Preview stats */}
            <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#8C857E]">
              <span className="flex items-center gap-2">
                <FileText size={14} />
                {wordCount} words
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 size={14} />
                Live preview enabled
              </span>
            </div>

            <button
              onClick={printResume}
              className="no-print mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-[#D9C9D9] bg-white px-5 py-4 text-sm font-bold text-[#49364B] transition hover:bg-[#F1EAF1]"
            >
              <Download size={18} />
              Download / Print Resume
            </button>

            <div className="no-print mt-5 rounded-2xl border border-[#E7E2DA] bg-white p-5">
              <p className="flex items-start gap-2 text-xs leading-6 text-[#817A73]">
                <ShieldCheck
                  size={17}
                  className="mt-1 shrink-0 text-[#987C58]"
                />
                Your resume is stored locally in
                this browser. Export your PDF
                to keep a separate copy.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="no-print border-t border-[#E7E2DA] bg-[#F7F5F0] px-8 py-7 text-center text-xs text-[#969087]">
          CareerForge AI — Built with Next.js,
          Tailwind CSS and Google Gemini
        </footer>
      </div>
    </main>
  );
}
