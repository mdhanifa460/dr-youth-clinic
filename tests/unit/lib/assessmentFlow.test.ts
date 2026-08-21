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

// Same bug shape, reproduced for the Hair/Skin/Body Pre-Consultation
// Assessment (app/(public)/skin-quiz/page.tsx) — that page's own
// getOrderedQuestions() call had no extraTags at all until this fix, so
// it had zero defense against the exact mistake that already hit Hair
// once (conditionTags-gating a question without also tagging a matching
// answer). Skin/Body happened to have no conditionTags-gated questions
// live at the time this was found, which is why the bug never actually
// manifested in production data — but the next admin who gates a Skin
// or Body question the same way Hair's "rapid-progression-detail" is
// gated, without perfectly remembering to tag a matching answer, would
// have hit this. Mirrors skin-quiz/page.tsx's own fix: pass the picked
// assessment type's own key as extraTags.
describe('assessmentFlow — the same gap, for skin-quiz\'s Hair/Skin/Body types (not just Plan My Journey goals)', () => {
  it('a "skin"-gated question with no matching answer tag anywhere is unreachable without extraTags…', () => {
    const skinQuestions: AssessmentQuestion[] = [
      mkQuestion('primary-concern', 1, []),
      mkQuestion('skin-follow-up', 2, ['skin']),
    ];
    const ordered = getOrderedQuestions(skinQuestions, { 'primary-concern': 'primary-concern-a' });
    expect(ordered.map((q) => q.id)).not.toContain('skin-follow-up');
  });

  it('…and is guaranteed reachable once the picked type\'s own key is passed as extraTags', () => {
    const skinQuestions: AssessmentQuestion[] = [
      mkQuestion('primary-concern', 1, []),
      mkQuestion('skin-follow-up', 2, ['skin']),
    ];
    const ordered = getOrderedQuestions(skinQuestions, {}, undefined, ['skin']);
    expect(ordered.map((q) => q.id)).toContain('skin-follow-up');
  });

  it('a "body"-gated question is unaffected by the "skin" extraTag (no cross-type leakage)', () => {
    const bodyQuestions: AssessmentQuestion[] = [
      mkQuestion('primary-concern', 1, []),
      mkQuestion('body-follow-up', 2, ['body']),
    ];
    const ordered = getOrderedQuestions(bodyQuestions, {}, undefined, ['skin']);
    expect(ordered.map((q) => q.id)).not.toContain('body-follow-up');
  });
});
