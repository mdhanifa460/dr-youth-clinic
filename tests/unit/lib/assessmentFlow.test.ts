import { describe, it, expect } from 'vitest';
import { getOrderedQuestions, collectAnsweredTags } from '@/app/lib/assessmentFlow';
import type { AssessmentQuestion } from '@/app/lib/quizDefaults';

// Reproduces the exact real-world shape found in production: a goal
// (Hair) whose admin-authored questions are conditionTags-gated, but
// where every single answer option — across every question — carries an
// empty tags array. Reported live: Plan My Journey asked exactly one
// (the sole unconditional) question, then jumped straight to
// photo-capture for every visitor, no matter what they answered — the
// other 12 questions were permanently unreachable because nothing ever
// added "hair" to the collected-tags pool.
function mkQuestion(id: string, order: number, conditionTags: string[]): AssessmentQuestion {
  return {
    id,
    title: id,
    subtitle: '',
    description: '',
    icon: '',
    image: '',
    type: 'single',
    order,
    required: true,
    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 1,
    sliderUnit: '',
    conditionTags,
    answers: [
      { id: `${id}-a`, title: 'A', description: '', icon: '', image: '', score: 0, tags: [], weight: 0, nextQuestionId: '' },
      { id: `${id}-b`, title: 'B', description: '', icon: '', image: '', score: 0, tags: [], weight: 0, nextQuestionId: '' },
    ],
  } as AssessmentQuestion;
}

describe('assessmentFlow — conditionTags-gated questions with no matching answer tags anywhere', () => {
  // 12 gated + 1 unconditional, matching production's real Hair config exactly.
  const questions: AssessmentQuestion[] = [
    ...Array.from({ length: 3 }, (_, i) => mkQuestion(`hair-${i + 1}`, i + 1, ['hair'])),
    mkQuestion('bootstrap', 4, []),
    ...Array.from({ length: 9 }, (_, i) => mkQuestion(`hair-${i + 4}`, i + 5, ['hair'])),
  ];

  it('BEFORE the fix (no extraTags): only the unconditional question is ever reachable, regardless of what gets answered', () => {
    // Simulates the bug exactly: answer the bootstrap question (whose own
    // answer carries no tags, matching production) and recompute.
    const answers = { bootstrap: 'bootstrap-a' };
    const ordered = getOrderedQuestions(questions, answers);
    expect(ordered).toHaveLength(1);
    expect(ordered[0].id).toBe('bootstrap');
    // Nothing was ever added to the tag pool — this is the actual defect.
    expect(collectAnsweredTags(questions, answers).size).toBe(0);
  });

  it('AFTER the fix: passing the goal\'s own concernTags as extraTags unlocks every gated question from the start', () => {
    const ordered = getOrderedQuestions(questions, {}, undefined, ['hair']);
    // All 13 questions become visible/orderable as soon as the goal is picked.
    expect(ordered).toHaveLength(13);
    expect(ordered.map((q) => q.id)).toEqual([
      'hair-1', 'hair-2', 'hair-3', 'bootstrap', 'hair-4', 'hair-5', 'hair-6',
      'hair-7', 'hair-8', 'hair-9', 'hair-10', 'hair-11', 'hair-12',
    ]);
  });

  it('a goal with no matching concernTags at all still only sees unconditional questions (no false-unlocking of unrelated goals)', () => {
    const ordered = getOrderedQuestions(questions, {}, undefined, ['skin']);
    expect(ordered).toHaveLength(1);
    expect(ordered[0].id).toBe('bootstrap');
  });

  it('answer-derived tags (the original, still-supported mechanism) keep working exactly as before', () => {
    const tagged: AssessmentQuestion = {
      ...mkQuestion('concern', 0, []),
      answers: [
        { id: 'concern-hair', title: 'Hair', description: '', icon: '', image: '', score: 0, tags: ['hair'], weight: 0, nextQuestionId: '' },
      ],
    };
    const ordered = getOrderedQuestions([tagged, ...questions], { concern: 'concern-hair' });
    // No extraTags needed here — the answer itself carries the tag.
    expect(ordered.map((q) => q.id)).toContain('hair-1');
  });
});
