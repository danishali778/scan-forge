import type { SessionTask, SessionStep, TimelineEvent, LiveEvent } from "@/types/session-command";
import type { ApiSessionEvent, ApiTask, ApiStep } from "@/types/api";
import { formatEventTime } from "@/lib/formatters";

function mapStepStatus(status: string): SessionStep["status"] {
  if (status === "completed") {
    return "completed";
  }

  if (["running", "awaiting_input"].includes(status)) {
    return "running";
  }

  return "pending";
}

function mapTaskStatus(task: ApiTask): SessionTask["status"] {
  if (task.status === "completed") {
    return "completed";
  }

  if (task.steps.some((step) => ["running", "awaiting_input"].includes(step.status))) {
    return "in_progress";
  }

  if (["running", "blocked", "planned"].includes(task.status)) {
    return "in_progress";
  }

  return "pending";
}

function mapStep(step: ApiStep, index: number): SessionStep {
  return {
    id: step.id,
    index: `${index + 1}`,
    title: step.title,
    status: mapStepStatus(step.status),
    duration: step.status === "running" ? "In progress" : undefined,
  };
}

export function mapApiTasks(tasks: ApiTask[]): SessionTask[] {
  return tasks
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((task, taskIndex) => {
      const steps = task.steps
        .slice()
        .sort((left, right) => left.position - right.position)
        .map((step, stepIndex) => ({
          ...mapStep(step, stepIndex),
          index: `${taskIndex + 1}.${stepIndex + 1}`,
        }));

      return {
        id: task.id,
        index: `${taskIndex + 1}.`,
        title: task.title,
        completeCount: steps.filter((step) => step.status === "completed").length,
        totalCount: steps.length,
        status: mapTaskStatus(task),
        steps,
      };
    });
}

function eventTone(eventType: string): TimelineEvent["tone"] {
  if (eventType.includes("failed") || eventType.includes("denied")) {
    return "blue";
  }

  if (eventType.includes("finished") || eventType.includes("completed")) {
    return "green";
  }

  return "teal";
}

function eventDetail(event: ApiSessionEvent): string {
  const payload = event.payload;

  if (typeof payload.summary === "string") {
    return payload.summary;
  }

  if (typeof payload.status === "string") {
    return payload.status;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return event.event_type;
}

export function mapTimelineEvents(events: ApiSessionEvent[]): TimelineEvent[] {
  return events.slice(-8).map((event) => ({
    time: formatEventTime(event.created_at),
    event: event.event_type,
    actor: event.actor_type,
    detail: eventDetail(event),
    tone: eventTone(event.event_type),
  }));
}

export function mapLiveEvents(events: ApiSessionEvent[]): LiveEvent[] {
  return events.slice(-5).map((event) => ({
    time: formatEventTime(event.created_at),
    event: event.event_type,
    actor: event.actor_type,
    detail: eventDetail(event),
  }));
}
