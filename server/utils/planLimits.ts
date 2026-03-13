import db from '../db.ts';

export type EffectivePlan = {
  minutesLimit: number;
  extraMinutesOverride: number;
  totalMinutesLimit: number;
  languageChangesLimit: number;
  hasVideoCaption: boolean;
  hasCloudSave: boolean;
  hasProAnalysis: boolean;
  analysisModel: string;
  transcriptModel: string;
  isUnlimited: boolean;
  softLimitPercent: number;
  hardLimitPercent: number;
  softLimitMinutes: number;
  hardLimitMinutes: number;
  planId: string;
  role: string;
};

export async function getUserEffectivePlan(userId: string): Promise<EffectivePlan | null> {
  const user = await db.queryOne(
    'SELECT plan_id, role, extra_minutes_override, language_changes_override, video_caption_override, cloud_save_override, pro_analysis_override FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return null;

  const planId = user.plan_id || 'starter';
  const plan = await db.queryOne(
    'SELECT minutes_limit, language_changes_limit, video_caption, cloud_save, pro_analysis_enabled, analysis_model, transcript_model, soft_limit_percent, hard_limit_percent FROM plans WHERE id = ?',
    [planId]
  );

  const baseMinutes = plan ? Number(plan.minutes_limit) : 60;
  const extraOverride = Number(user.extra_minutes_override ?? 0) || 0;
  const totalMinutesLimit = baseMinutes + extraOverride;
  const isUnlimited = user.role === 'admin' || totalMinutesLimit >= 999999;

  const planLangLimit = plan?.language_changes_limit != null ? Number(plan.language_changes_limit) : -1;
  const langOverride = user.language_changes_override;
  const languageChangesLimit = langOverride != null ? Number(langOverride) : planLangLimit;

  const planVideoCaption = !!(plan?.video_caption === true || plan?.video_caption === 1);
  const vidOverride = user.video_caption_override;
  const hasVideoCaption = vidOverride != null ? !!vidOverride : planVideoCaption;

  const planCloudSave = !!(plan?.cloud_save === true || plan?.cloud_save === 1);
  const csOverride = user.cloud_save_override;
  const hasCloudSave = csOverride != null ? !!csOverride : planCloudSave;

  const planProAnalysis = !!(plan?.pro_analysis_enabled === true || plan?.pro_analysis_enabled === 1);
  const paOverride = user.pro_analysis_override;
  const hasProAnalysis = paOverride != null ? !!paOverride : planProAnalysis;

  const softPct = Number(plan?.soft_limit_percent ?? 100);
  const hardPct = Number(plan?.hard_limit_percent ?? 100);

  return {
    minutesLimit: baseMinutes,
    extraMinutesOverride: extraOverride,
    totalMinutesLimit,
    languageChangesLimit,
    hasVideoCaption,
    hasCloudSave,
    hasProAnalysis,
    analysisModel: plan?.analysis_model || 'gemini-2.5-flash',
    transcriptModel: plan?.transcript_model || 'gemini-2.5-flash',
    isUnlimited,
    softLimitPercent: softPct,
    hardLimitPercent: hardPct,
    softLimitMinutes: Math.round(totalMinutesLimit * softPct / 100),
    hardLimitMinutes: Math.round(totalMinutesLimit * hardPct / 100),
    planId,
    role: user.role,
  };
}
