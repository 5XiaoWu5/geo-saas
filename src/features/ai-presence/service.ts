import { checkDiscoverability } from "./discoverability";
import { aiPresenceRepository } from "./repository";
import { buildSchemaRecommendations } from "./schema-recommendations";
import type {
  AIPresencePlatform,
  AIPresenceStatus,
  AIPresenceSummary,
  AIPresenceTaskType,
  CompanyPresenceProfile,
  DiscoverabilityEvidence,
  PresenceIssue,
  PresenceNextStep,
} from "./types";

export class AIPresenceError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export const AI_PRESENCE_PLATFORMS = [
  {
    platform: "GOOGLE_SEARCH_CONSOLE",
    name: "Google Search Console",
    category: "SEARCH_INDEX",
    officialUrl: "https://search.google.com/search-console",
    taskType: "SUBMIT_SITEMAP",
  },
  {
    platform: "GOOGLE_BUSINESS_PROFILE",
    name: "Google Business Profile",
    category: "LOCAL_BUSINESS",
    officialUrl: "https://www.google.com/business/",
    taskType: "CREATE_BUSINESS_PROFILE",
  },
  {
    platform: "GOOGLE_MERCHANT_CENTER",
    name: "Google Merchant Center",
    category: "PRODUCT_DATA",
    officialUrl: "https://merchants.google.com/",
    taskType: "SUBMIT_PRODUCT_FEED",
  },
  {
    platform: "BING_WEBMASTER_TOOLS",
    name: "Bing Webmaster Tools",
    category: "SEARCH_INDEX",
    officialUrl: "https://www.bing.com/webmasters/",
    taskType: "SUBMIT_SITEMAP",
  },
  {
    platform: "INDEXNOW",
    name: "IndexNow",
    category: "SITEMAP_SUBMISSION",
    officialUrl: "https://www.indexnow.org/documentation",
    taskType: "SUBMIT_SITEMAP",
  },
] as const satisfies ReadonlyArray<{
  platform: AIPresencePlatform;
  name: string;
  category: "SEARCH_INDEX" | "LOCAL_BUSINESS" | "PRODUCT_DATA" | "SITEMAP_SUBMISSION";
  officialUrl: string;
  taskType: AIPresenceTaskType;
}>;

async function requireProject(userId: string, projectId: string) {
  const access = await aiPresenceRepository.projectAccess(userId, projectId);
  if (access === "NOT_FOUND") throw new AIPresenceError("PROJECT_NOT_FOUND", 404);
  if (access === "FORBIDDEN") throw new AIPresenceError("PROJECT_FORBIDDEN", 403);
}

function discovery(task: Awaited<ReturnType<typeof aiPresenceRepository.list>>[number] | null) {
  if (!task) return null;
  const evidence = task.evidence as Partial<DiscoverabilityEvidence>;
  return evidence.version === "ai-presence-check-v1" ? evidence as DiscoverabilityEvidence : null;
}

function profileField(
  key: string,
  value: string | string[],
  source: string,
  updatedAt: string | null,
) {
  return { key, complete: Array.isArray(value) ? value.length > 0 : Boolean(value.trim()), value, source, updatedAt };
}

function buildProfileFields(profile: CompanyPresenceProfile) {
  return [
    profileField("legalName", profile.legalName, "EntityAttribute", profile.updatedAt),
    profileField("brandName", profile.brandName, "EntityProfile", profile.updatedAt),
    profileField("description", profile.description, "EntityProfile", profile.updatedAt),
    profileField("products", profile.products, "ProductEntity / EntityProfile", profile.updatedAt),
    profileField("services", profile.services, "ServiceEntity / EntityProfile", profile.updatedAt),
    profileField("officialWebsite", profile.officialWebsite, "Project", profile.updatedAt),
    profileField("phone", profile.phone, "EntityAttribute", profile.updatedAt),
    profileField("email", profile.email, "EntityAttribute", profile.updatedAt),
    profileField("address", profile.address, "EntityAttribute", profile.updatedAt),
    profileField("serviceAreas", profile.serviceAreas, "EntityAttribute", profile.updatedAt),
    profileField("businessHours", profile.businessHours, "EntityAttribute", profile.updatedAt),
    profileField("businessType", profile.businessType, "EntityAttribute", profile.updatedAt),
    profileField("trustedSources", profile.trustedSources, "EntityAttribute", profile.updatedAt),
  ];
}

function issuesFor(profile: CompanyPresenceProfile, evidence: DiscoverabilityEvidence | null) {
  const issues: PresenceIssue[] = [];
  const companyName = profile.legalName || profile.brandName;
  if (!companyName) issues.push({ key: "company-name", severity: "HIGH", title: "企业名称尚未确认", reason: "搜索系统无法稳定关联网站、品牌与企业主体。", action: "补充法定名称或品牌名称。" });
  if (!profile.phone && !profile.email) issues.push({ key: "contact", severity: "HIGH", title: "缺少公开联系方式", reason: "客户和搜索系统无法验证企业联系入口。", action: "补充电话或联系邮箱。" });
  if (!profile.products.length && !profile.services.length) issues.push({ key: "offering", severity: "HIGH", title: "缺少产品或服务资料", reason: "AI 无法确认企业具体提供什么。", action: "至少补充一项真实产品或服务。" });
  if (!evidence) issues.push({ key: "no-check", severity: "HIGH", title: "尚未检查网站可发现性", reason: "当前没有 robots、Sitemap、索引设置或核心页面的实时证据。", action: "运行一次网站实时检查。" });
  if (evidence?.errorCode) issues.push({ key: "check-failed", severity: "HIGH", title: "网站检查失败", reason: `安全检查未完成（${evidence.errorCode}）。`, action: "确认官网可公开访问后重新检查。" });
  if (evidence && !evidence.homepage.accessible) issues.push({ key: "homepage", severity: "HIGH", title: "网站当前不可访问", reason: `首页返回 ${evidence.homepage.statusCode ?? "不可用"}。`, action: "检查域名、服务器或访问限制。" });
  if (evidence?.homepage.indexingAllowed === false) issues.push({ key: "noindex", severity: "HIGH", title: "首页禁止索引", reason: "Meta Robots 或 X-Robots-Tag 包含 noindex。", action: "检查并修复索引设置。" });
  const blocked = evidence?.robots.crawlers.filter(item => item.status === "BLOCKED") ?? [];
  if (blocked.length) issues.push({ key: "robots-blocked", severity: "HIGH", title: "相关搜索爬虫被阻止", reason: `${blocked.map(item => item.crawler).join("、")} 当前匹配禁止规则。`, action: "查看 robots.txt 修复建议。" });
  if (evidence && !evidence.sitemap.readable) issues.push({ key: "sitemap", severity: "MEDIUM", title: "未发现可读取的 Sitemap", reason: "重要页面可能更难被持续发现。", action: "创建并发布 sitemap.xml。" });
  if (evidence && !evidence.corePages.some(item => item.kind === "CONTACT" && item.found)) issues.push({ key: "contact-page", severity: "MEDIUM", title: "未发现联系我们页面", reason: "本次首页与 Sitemap 证据中未发现独立联系页面。", action: "创建联系页面方案。" });
  if (evidence && !evidence.schema.types.includes("Organization")) issues.push({ key: "organization-schema", severity: "MEDIUM", title: "未发现 Organization Schema", reason: "结构化企业身份信号不足。", action: "查看基于真实资料的 Schema 方案。" });
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 3);
}

function nextStepFor(
  projectId: string,
  profile: CompanyPresenceProfile,
  evidence: DiscoverabilityEvidence | null,
  issues: PresenceIssue[],
  platformTasks: Awaited<ReturnType<typeof aiPresenceRepository.list>>,
  aiResultCount: number,
): PresenceNextStep {
  if (!profile.legalName && !profile.brandName || !profile.phone && !profile.email || !profile.products.length && !profile.services.length) {
    return { key: "complete-profile", label: "完善企业资料", href: null, action: "EDIT_PROFILE" };
  }
  if (!evidence) return { key: "run-check", label: "检查网站可发现性", href: null, action: "RUN_CHECK" };
  if (evidence.errorCode || !evidence.homepage.accessible || evidence.homepage.indexingAllowed === false || evidence.robots.crawlers.some(item => item.status === "BLOCKED")) {
    return { key: "review-evidence", label: "查看并处理网站问题", href: null, action: "VIEW_EVIDENCE" };
  }
  if (issues.length) return { key: "resolve-gap", label: "查看首要改进项", href: null, action: "VIEW_EVIDENCE" };
  if (!platformTasks.some(task => task.status === "SUBMITTED")) {
    return { key: "submit-platform", label: "打开平台提交中心", href: null, action: "SUBMIT_PLATFORM" };
  }
  if (!aiResultCount) return { key: "run-ai-check", label: "运行真实 AI 搜索验证", href: `/projects/${projectId}/geo/monitoring`, action: "RUN_AI_CHECK" };
  return { key: "review-ai-check", label: "查看 AI 搜索验证结果", href: `/projects/${projectId}/geo/monitoring-center`, action: "RUN_AI_CHECK" };
}

function readinessFor(
  evidence: DiscoverabilityEvidence | null,
  issues: PresenceIssue[],
  aiEvidence: Awaited<ReturnType<typeof aiPresenceRepository.aiEvidence>>,
  tasks: Awaited<ReturnType<typeof aiPresenceRepository.list>>,
) {
  if (aiEvidence.cited) return "CITED" as const;
  if (aiEvidence.mentioned) return "MENTIONED" as const;
  const verifiedStatus = (["INDEXED", "CRAWLED"] as const).find(status =>
    tasks.some(task => task.status === status && task.evidenceStatus === "VERIFIED"),
  );
  if (verifiedStatus) return verifiedStatus;
  if (tasks.some(task => task.status === "SUBMITTED" && task.evidenceStatus === "USER_DECLARED")) return "SUBMITTED" as const;
  if (evidence?.errorCode) return "FAILED" as const;
  if (!evidence) return "NOT_STARTED" as const;
  if (issues.some(issue => issue.severity === "HIGH")) return "NEEDS_ATTENTION" as const;
  return "READY" as const;
}

export async function getAIPresenceSummary(userId: string, projectId: string): Promise<AIPresenceSummary> {
  await requireProject(userId, projectId);
  const [profile, tasks, aiEvidence] = await Promise.all([
    aiPresenceRepository.profile(userId, projectId),
    aiPresenceRepository.list(userId, projectId, 100),
    aiPresenceRepository.aiEvidence(userId, projectId),
  ]);
  if (!profile) throw new AIPresenceError("PROJECT_FORBIDDEN", 403);
  const latestCheck = tasks.find(task => task.taskType === "CHECK_DISCOVERABILITY") ?? null;
  const evidence = discovery(latestCheck);
  const platformTasks = tasks.filter(task => AI_PRESENCE_PLATFORMS.some(platform => platform.platform === task.platform));
  const issues = issuesFor(profile, evidence);
  const completed = tasks
    .filter(task => task.evidenceStatus === "VERIFIED" || task.evidenceStatus === "USER_DECLARED")
    .slice(0, 8)
    .map(task => ({ title: task.evidenceSummary, source: task.source, completedAt: task.verifiedAt ?? task.submittedAt ?? task.createdAt }));
  return {
    projectId,
    readiness: readinessFor(evidence, issues, aiEvidence, tasks),
    stages: {
      READY: latestCheck?.status === "READY" && latestCheck.evidenceStatus === "VERIFIED",
      SUBMITTED: tasks.some(task => task.status === "SUBMITTED" && task.evidenceStatus === "USER_DECLARED"),
      CRAWLED: tasks.some(task => task.status === "CRAWLED" && task.evidenceStatus === "VERIFIED"),
      INDEXED: tasks.some(task => task.status === "INDEXED" && task.evidenceStatus === "VERIFIED"),
      MENTIONED: aiEvidence.mentioned,
      CITED: aiEvidence.cited,
    },
    profile,
    profileFields: buildProfileFields(profile),
    issues,
    completed,
    nextStep: nextStepFor(projectId, profile, evidence, issues, platformTasks, aiEvidence.resultCount),
    latestCheck,
    tasks,
    platformTasks,
    schemaRecommendations: buildSchemaRecommendations(profile, evidence),
    platforms: [...AI_PRESENCE_PLATFORMS],
    aiEvidence,
  };
}

export async function saveCompanyPresenceProfile(
  userId: string,
  projectId: string,
  input: Omit<CompanyPresenceProfile, "projectId" | "projectName" | "updatedAt">,
) {
  await requireProject(userId, projectId);
  const profile = await aiPresenceRepository.saveProfile(userId, projectId, input);
  if (!profile) throw new AIPresenceError("PROFILE_SAVE_FAILED", 500);
  return profile;
}

export async function runDiscoverabilityCheck(userId: string, projectId: string) {
  await requireProject(userId, projectId);
  const profile = await aiPresenceRepository.profile(userId, projectId);
  if (!profile?.officialWebsite) throw new AIPresenceError("OFFICIAL_WEBSITE_REQUIRED", 422);
  const evidence = await checkDiscoverability(profile.officialWebsite, {
    legalName: profile.legalName || profile.brandName,
    phone: profile.phone,
    address: profile.address,
    businessHours: profile.businessHours,
  });
  const task = await aiPresenceRepository.createCheck(userId, projectId, evidence);
  if (!task) throw new AIPresenceError("DISCOVERABILITY_CHECK_SAVE_FAILED", 500);
  return task;
}

export async function listAIPresenceTasks(userId: string, projectId: string, limit?: number) {
  await requireProject(userId, projectId);
  return aiPresenceRepository.list(userId, projectId, limit);
}

export async function getAIPresenceTask(userId: string, projectId: string, taskId: string) {
  await requireProject(userId, projectId);
  const task = await aiPresenceRepository.detail(userId, projectId, taskId);
  if (!task) throw new AIPresenceError("AI_PRESENCE_TASK_NOT_FOUND", 404);
  return task;
}

export async function declarePlatformSubmission(
  userId: string,
  projectId: string,
  input: { platform: AIPresencePlatform; taskType: AIPresenceTaskType; targetUrl: string | null },
) {
  await requireProject(userId, projectId);
  const platform = AI_PRESENCE_PLATFORMS.find(item => item.platform === input.platform && item.taskType === input.taskType);
  if (!platform) throw new AIPresenceError("PLATFORM_TASK_INVALID", 422);
  const [profile, tasks] = await Promise.all([
    aiPresenceRepository.profile(userId, projectId),
    aiPresenceRepository.list(userId, projectId, 20),
  ]);
  const latestCheck = tasks.find(task => task.taskType === "CHECK_DISCOVERABILITY");
  const evidence = discovery(latestCheck ?? null);
  const blockers = profile ? issuesFor(profile, evidence).filter(issue => issue.severity === "HIGH") : [];
  if (!latestCheck || latestCheck.status !== "READY" || blockers.length) {
    throw new AIPresenceError("AI_PRESENCE_NOT_READY", 409);
  }
  const task = await aiPresenceRepository.createSubmission(userId, projectId, input);
  if (!task) throw new AIPresenceError("PLATFORM_SUBMISSION_SAVE_FAILED", 500);
  return task;
}

export function canTransitionPresenceStatus(current: AIPresenceStatus, next: AIPresenceStatus, source: string) {
  if (next === "SUBMITTED") return current === "READY" && source === "USER_DECLARATION";
  if (next === "CRAWLED") return current === "SUBMITTED" && (source === "LIVE_CRAWL" || source === "SERVER_LOG");
  if (next === "INDEXED") return current === "CRAWLED" && (source === "SEARCH_CONSOLE" || source === "BING_WEBMASTER");
  if (next === "MENTIONED") return current === "INDEXED" && source === "AI_SEARCH_RESULT";
  if (next === "CITED") return current === "MENTIONED" && source === "AI_SEARCH_CITATION";
  return false;
}
