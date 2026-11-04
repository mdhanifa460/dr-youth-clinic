import { describe, it, expect } from 'vitest';
import { planStatusChange } from '@/app/lib/landingPages/bulkStatus';

const hero = { type: 'hero', data: { phone: '7200865777' } };
const form = { type: 'form' };
const required = ['hero', 'form'];

const page = (over: object) => ({ _id: 'a', title: 'A', slug: 'a', status: 'draft', sections: [hero, form], ...over });

describe('planStatusChange', () => {
  it('marks a complete draft ready to publish, with no warning', () => {
    const plan = planStatusChange([page({})], 'published', required);
    expect(plan.ready.map((p) => p.id)).toEqual(['a']);
    expect(plan.warnings).toHaveLength(0);
  });

  it('blocks a page missing a required section and names it', () => {
    const plan = planStatusChange([page({ sections: [hero] })], 'published', required);
    expect(plan.ready).toHaveLength(0);
    expect(plan.blocked[0].note).toContain('Form');
  });

  it('warns when a page would fall back to the default number, but still publishes', () => {
    const plan = planStatusChange([page({ sections: [{ type: 'hero', data: {} }, form] })], 'published', required);
    expect(plan.ready).toHaveLength(1);
    expect(plan.warnings[0].note).toContain('default number');
  });

  it('leaves pages already in the target status alone', () => {
    const plan = planStatusChange([page({ status: 'published' })], 'published', required);
    expect(plan.ready).toHaveLength(0);
    expect(plan.alreadyThere).toHaveLength(1);
  });

  it('never blocks moving a page to draft', () => {
    const plan = planStatusChange([page({ status: 'published', sections: [] })], 'draft', required);
    expect(plan.ready).toHaveLength(1);
    expect(plan.blocked).toHaveLength(0);
  });

  it('lets Undo republish a page that lacks a required section', () => {
    const plan = planStatusChange([page({ sections: [hero] })], 'published', required, true);
    expect(plan.ready).toHaveLength(1);
    expect(plan.blocked).toHaveLength(0);
  });
});
