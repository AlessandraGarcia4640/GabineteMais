import { z } from 'zod';
import * as shared from '@gabinete-plus/shared';

// Keep names stable for clients. Payloads are generated from the shared contracts.
export const contractSchemas = {
  Permission: shared.permissionSchema, CurrentAccess: shared.currentAccessSchema, UserPermissions: shared.userPermissionsSchema,
  UserRole: shared.userRoleSchema, UserPosition: shared.userPositionSchema, UserSummary: shared.userSummarySchema,
  UserPositionHistory: shared.positionHistorySchema, LoginRequest: shared.loginRequestSchema, LoginResponse: shared.loginResponseSchema,
  RefreshRequest: shared.refreshRequestSchema, RefreshResponse: shared.refreshResponseSchema, LogoutRequest: shared.logoutRequestSchema,
  ApiError: shared.apiErrorSchema, HealthResponse: shared.healthResponseSchema,
  UserDetail: shared.userDetailSchema, CreateUser: shared.createUserSchema, UpdateProfile: shared.updateProfileSchema,
  ChangePosition: shared.changePositionSchema, UserPage: shared.userPageSchema, PositionPage: shared.positionPageSchema,
  CreateRoutine: shared.createRoutineSchema, UpdateRoutine: shared.updateRoutineSchema, Routine: shared.routineSchema, RoutinePage: shared.routinePageSchema,
  CreateChecklist: shared.createChecklistSchema, UpdateChecklist: shared.updateChecklistSchema, StartChecklist: shared.startChecklistSchema,
  MarkChecklistItem: shared.markChecklistItemSchema, ChecklistTemplate: shared.checklistTemplateSchema, ChecklistItem: shared.checklistItemSchema,
  ChecklistRun: shared.checklistRunSchema, ChecklistTemplatePage: shared.checklistTemplatePageSchema, ChecklistRunPage: shared.checklistRunPageSchema,
  CreateContact: shared.createContactSchema, UpdateContact: shared.updateContactSchema, Contact: shared.contactSchema, ContactPage: shared.contactPageSchema,
  CreateTask: shared.createTaskSchema, UpdateTask: shared.updateTaskSchema, AssignTask: shared.assignTaskSchema,
  ChangeTaskStatus: shared.changeTaskStatusSchema, Task: shared.taskSchema, TaskEvent: shared.taskEventSchema, TaskPage: shared.taskPageSchema, TaskEventPage: shared.taskEventPageSchema,
};
export const queryContractSchemas = {
  '/users': shared.userListQuerySchema, '/users/{id}/positions': shared.historyQuerySchema,
  '/routines': shared.routineListQuerySchema, '/checklists/templates': shared.checklistListQuerySchema,
  '/checklists/runs': shared.checklistRunQuerySchema, '/contacts': shared.contactListQuerySchema,
  '/tasks': shared.taskListQuerySchema, '/tasks/{id}/history': shared.taskHistoryQuerySchema,
};
export function generatedQueryParameters() {
  return Object.fromEntries(Object.entries(queryContractSchemas).map(([path, schema]) => {
    const json = z.toJSONSchema(schema, { io: 'input' });
    const parameters = Object.entries(json.properties ?? {}).map(([name, property]) => ({ name, in: 'query', schema: property }));
    return [path, parameters] satisfies [string, typeof parameters];
  }));
}
function qualifyReferences(value: z.infer<ReturnType<typeof z.json>>, name: string): void {
  if (value === null || typeof value !== 'object') return;
  if (!Array.isArray(value) && typeof value.$ref === 'string' && value.$ref.startsWith('#/$defs/')) {
    value.$ref = `#/components/schemas/${name}/${value.$ref.slice(2)}`;
  }
  for (const nested of Object.values(value)) qualifyReferences(nested, name);
}
export function generatedContractSchemas() {
  const schemas: Record<string, z.infer<ReturnType<typeof z.json>>> = {};
  for (const [name, schema] of Object.entries(contractSchemas)) {
    const result = z.toJSONSchema(schema, { io: 'input' });
    delete result.$schema;
    // Cross-field refinements need explicit JSON Schema constraints or prose.
    if (['UpdateProfile', 'UpdateRoutine', 'UpdateChecklist', 'UpdateContact', 'UpdateTask'].includes(name)) result.minProperties = 1;
    const json = z.json().parse(result);
    qualifyReferences(json, name);
    schemas[name] = json;
  }
  return schemas;
}
