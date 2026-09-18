import { z } from 'zod';

export const JourneyTriggerTypeEnum = z.enum([
  'LEAD_CREATED',
  'LEAD_BECAME_HOT',
  'LEAD_BECAME_STALE',
  'LEAD_BECAME_AT_RISK',
  'APPOINTMENT_COMPLETED',
  'OPPORTUNITY_STAGE_CHANGED',
  'MANUAL_ENROLLMENT',
]);

export type JourneyTriggerType = z.infer<typeof JourneyTriggerTypeEnum>;

export const JourneyStepTypeEnum = z.enum([
  'ACTION',
  'WAIT',
  'CONDITION',
  'BRANCH',
  'AI_DECISION',
  'END',
]);

export type JourneyStepType = z.infer<typeof JourneyStepTypeEnum>;

export const JourneyActionTypeEnum = z.enum([
  'CREATE_TASK',
  'ASSIGN_LEAD',
  'UPDATE_LEAD_STATUS',
  'SEND_SMS',
  'NOTIFY_AGENT',
]);

export type JourneyActionType = z.infer<typeof JourneyActionTypeEnum>;

export const ConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'EXISTS']),
  value: z.any(),
});

export const JourneyStepSchema = z.object({
  id: z.string(),
  type: JourneyStepTypeEnum,
  actionType: JourneyActionTypeEnum.optional(),
  actionConfig: z.record(z.string(), z.any()).optional(),
  delayMs: z.number().optional(),
  condition: ConditionSchema.optional(),
  truePathStepId: z.string().optional(),
  falsePathStepId: z.string().optional(),
  nextStepId: z.string().optional(),
});

export type JourneyStepConfig = z.infer<typeof JourneyStepSchema>;

export const JourneyDefinitionSchema = z.object({
  steps: z.array(JourneyStepSchema),
  startStepId: z.string(),
});
