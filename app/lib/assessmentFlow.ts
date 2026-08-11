// Shared Clinical Intake question-flow engine — extracted from
// app/(public)/skin-quiz/page.tsx so app/(public)/plan-my-journey/
// PlanMyJourneyClient.tsx can drive the exact same branching question
// engine instead of a second, parallel implementation. Client-safe (no
// mongoose imports), pure functions only — no React, no fetch side effects
// beyond the one tracking helper at the bottom.
import type { AssessmentQuestion, AssessmentSettings } from "./quizDefaults";
import type { AssessmentAnswers } from "./assessmentScoring";

// Dynamic Question Engine: a question with conditionTags only shows once
// the visitor's answers so far have collected at least one matching tag —
// empty conditionTags = universal, always shown.
//
// `extraTags` — tags considered "already collected" independent of any
// actual answer (e.g. Plan My Journey's picked goal's own concernTags —
// see PlanMyJourneyClient.tsx). Answer-derived tags stay the primary,
// content-authored mechanism; this is a defensive addition, not a
// replacement — see getOrderedQuestions' comment for why it exists.
export function collectAnsweredTags(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswers,
  extraTags: string[] = []
): Set<string> {
  const tags = new Set<string>(extraTags);
  for (const q of questions) {
    const given = answers[q.id];
    if (given === undefined || given === null || given === "") continue;
    const ids = Array.isArray(given) ? given : [String(given)];
    for (const id of ids) {
      const ans = q.answers.find((a) => a.id === id);
      ans?.tags.forEach((t) => tags.add(t));
    }
  }
  return tags;
}

// The "Enable 'Anything else for your doctor?' Note" Settings toggle only
// controls the specific quick-add "notes" question (id "notes"), not every
// free-text question — a doctor who adds a second, unrelated text question
// shouldn't have it silently hidden by a toggle labeled for a different one.
//
// `extraTags` (see collectAnsweredTags) closes a real gap found in
// production: an admin can gate a question behind conditionTags:["hair"]
// in the Clinical Intake editor without realizing that tag also has to be
// attached to some ANSWER OPTION somewhere (a separate field) for it to
// ever actually get collected — otherwise every conditionTags-gated
// question is permanently unreachable, no matter what the visitor
// answers. Confirmed live: 12 of 13 Hair questions were conditionTags:
// ["hair"]-gated, but literally zero answers anywhere in the config
// carried a "hair" tag, so the gate could never open — Plan My Journey
// asked exactly one (the sole unconditional) question then jumped
// straight to photo-capture for every visitor. Passing the picked goal's
// own concernTags through as extraTags means a goal always unlocks its
// own conditionTags-gated questions, regardless of whether an admin also
// remembered to tag an answer — answer-tag seeding (seedAnswersFromTags)
// keeps working exactly as before for the cases it already covered.
export function getOrderedQuestions(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswers,
  settings?: Pick<AssessmentSettings, "enableNotes">,
  extraTags: string[] = []
): AssessmentQuestion[] {
  const answeredTags = collectAnsweredTags(questions, answers, extraTags);
  return [...questions]
    .filter((q) => !(q.type === "text" && q.id === "notes" && settings?.enableNotes === false))
    .filter((q) => !q.conditionTags?.length || q.conditionTags.some((t) => answeredTags.has(t)))
    .sort((a, b) => a.order - b.order);
}

export function canProceedFromQuestion(
  question: AssessmentQuestion | undefined,
  currentAnswer: string | string[] | number | undefined
): boolean {
  return !question?.required || question.type === "photo" || (
    Array.isArray(currentAnswer) ? currentAnswer.length > 0 : currentAnswer !== undefined && currentAnswer !== ""
  );
}

// Branching: a chosen single-select answer can point to a specific next
// question; otherwise fall through to the next question in order. Guards
// against a misconfigured branch — a dangling nextQuestionId (its question
// was deleted after the branch was set) or a cycle (points back to an
// already-visited question) — either would otherwise strand the visitor on
// a blank page or in an infinite loop; both resolve to "no more questions".
export function resolveNextQuestionId(
  currentQuestion: AssessmentQuestion,
  currentAnswer: string | string[] | number | undefined,
  orderedQuestions: AssessmentQuestion[],
  currentIndex: number,
  path: string[]
): string | undefined {
  let nextId: string | undefined;
  if (typeof currentAnswer === "string") {
    const chosen = currentQuestion.answers.find((a) => a.id === currentAnswer);
    if (chosen?.nextQuestionId) nextId = chosen.nextQuestionId;
  }
  if (!nextId) nextId = orderedQuestions[currentIndex + 1]?.id;

  if (nextId && (!orderedQuestions.some((q) => q.id === nextId) || path.includes(nextId))) {
    nextId = undefined;
  }
  return nextId;
}

// Whether there's a next question to go to from here — used to estimate
// total step count for a progress bar without overcounting questions that
// branching will actually skip.
export function hasNextQuestion(
  currentQuestion: AssessmentQuestion | undefined,
  currentAnswer: string | string[] | number | undefined,
  orderedQuestions: AssessmentQuestion[],
  currentIndex: number,
  path: string[]
): boolean {
  if (!currentQuestion) return false;
  if (typeof currentAnswer === "string") {
    const chosen = currentQuestion.answers.find((a) => a.id === currentAnswer);
    if (chosen?.nextQuestionId) {
      return orderedQuestions.some((q) => q.id === chosen.nextQuestionId) && !path.includes(chosen.nextQuestionId);
    }
  }
  return !!orderedQuestions[currentIndex + 1];
}

// Plan My Journey's goal cards ARE the answer to Clinical Intake's "concern"
// question — picking "Hair Restoration" shouldn't make the visitor also
// click through a concern picker that just re-asks the same thing. Given a
// goal's mapped tags (see GOAL_CONCERN_TAGS in journeyGoals.ts), find every
// answer across every question whose own tags intersect the goal's tags and
// pre-fill that question as if the visitor had picked it — reusing the
// existing tag/weight machinery instead of adding a second, parallel
// goal-to-question mapping. Generic by design: works whichever question(s)
// an admin has tagged for a concern, not hardcoded to the question id
// "concern".
export function seedAnswersFromTags(questions: AssessmentQuestion[], targetTags: string[]): AssessmentAnswers {
  if (!targetTags.length) return {};
  const targetSet = new Set(targetTags);
  const seeded: AssessmentAnswers = {};
  for (const q of questions) {
    const matches = q.answers.filter((a) => a.tags.some((t) => targetSet.has(t))).map((a) => a.id);
    if (!matches.length) continue;
    seeded[q.id] = q.type === "multi" ? matches : matches[0];
  }
  return seeded;
}

// Thin, generic tracking helper — both skin-quiz and Plan My Journey call
// this instead of each owning their own fetch-and-swallow-errors wrapper.
// Never blocks the flow on a tracking failure (see the .catch below).
export function postAssessmentEvent(payload: Record<string, unknown>) {
  fetch("/api/assessment-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

const SESSION_ID_KEY = "assessmentSessionId";

// A random, non-identifying id scoped to sessionStorage (cleared when the
// tab closes) — lets Analytics group one visitor's own events (e.g. how
// many distinct steps they reached, or pair their "started" with their own
// "completed") without collecting anything that could identify them.
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
