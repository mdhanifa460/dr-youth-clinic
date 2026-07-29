import { describe, it, expect } from 'vitest';
import { resolveExperience, getAnimationDurations, resolveEffectivePresetId } from '@/app/lib/banners/experienceEngine';
import { EXPERIENCE_PRESETS } from '@/app/lib/banners/experiencePresets';

describe('resolveExperience — Experience Engine resolver', () => {
  it('resolves a preset banner to that preset\'s own values with no overrides', () => {
    const resolved = resolveExperience({ experiencePreset: 'hair-luxury' });
    const preset = EXPERIENCE_PRESETS['hair-luxury'];
    expect(resolved.vars).toEqual(preset.vars);
    expect(resolved.isDark).toBe(true);
    expect(resolved.glassBlur).toBe('xl');
    expect(resolved.glowIntensity).toBe('strong');
    expect(resolved.parallax).toBe(true);
  });

  it('falls back to the legacy heroTheme-based rendering when experiencePreset is missing (pre-existing banners)', () => {
    const resolved = resolveExperience({ heroTheme: 'gold' });
    expect(resolved.vars['--hero-accent']).toBe('#B8791A'); // gold theme's accent
    expect(resolved.glassBlur).toBe('xl');
    expect(resolved.entranceAnimation).toBe('none');
    expect(resolved.parallax).toBe(false);
  });

  it('falls back to legacy rendering when experiencePreset is an invalid/unknown id', () => {
    const resolved = resolveExperience({ experiencePreset: 'nonexistent-preset', heroTheme: 'aurora' });
    expect(resolved.vars['--hero-text']).toBe('#0B2560'); // aurora theme's text color
  });

  it('applies sparse overrides on top of the preset, leaving unset fields at the preset default', () => {
    const resolved = resolveExperience({
      experiencePreset: 'luxury-glass',
      experienceOverrides: { glassBlur: 'none', parallax: false },
    });
    expect(resolved.glassBlur).toBe('none'); // overridden
    expect(resolved.parallax).toBe(false); // overridden
    expect(resolved.glowIntensity).toBe('soft'); // untouched, inherited from preset
    expect(resolved.entranceAnimation).toBe('fade-rise'); // untouched, inherited from preset
  });

  it('an explicit `false` override is respected, not treated as "unset" (the ?? operator distinction)', () => {
    const resolved = resolveExperience({
      experiencePreset: 'weight-wellness', // scrollEffects: true by default
      experienceOverrides: { scrollEffects: false },
    });
    expect(resolved.scrollEffects).toBe(false);
  });

  it('colorThemeOverride swaps only the color vars, leaving glass/animation from the preset intact', () => {
    const resolved = resolveExperience({
      experiencePreset: 'corporate', // isDark: true, glassBlur: 'none'
      experienceOverrides: { colorThemeOverride: 'violet' },
    });
    expect(resolved.isDark).toBe(true); // violet is also a dark theme
    expect(resolved.glassBlur).toBe('none'); // still inherited from corporate preset, unaffected by color override
  });

  it('every one of the 7 presets resolves without throwing and returns a complete token set', () => {
    for (const id of Object.keys(EXPERIENCE_PRESETS)) {
      const resolved = resolveExperience({ experiencePreset: id });
      expect(resolved.vars).toBeDefined();
      expect(typeof resolved.isDark).toBe('boolean');
      expect(['none', 'md', 'xl']).toContain(resolved.glassBlur);
      expect(['none', 'soft', 'strong']).toContain(resolved.glowIntensity);
    }
  });
});

describe('resolveEffectivePresetId — Phase 4 seasonal/campaign preset overrides', () => {
  it('uses the base experiencePreset when no smartRules are attached', () => {
    const id = resolveEffectivePresetId({ experiencePreset: 'luxury-glass' }, null, new Date('2026-07-15'));
    expect(id).toBe('luxury-glass');
  });

  it('applies the seasonal override while inside the season window', () => {
    const id = resolveEffectivePresetId(
      { experiencePreset: 'luxury-glass' },
      { seasonStartMonth: 3, seasonEndMonth: 6, seasonalPresetOverride: 'skin-glow' },
      new Date('2026-04-15') // April — inside March-June
    );
    expect(id).toBe('skin-glow');
  });

  it('does not apply the seasonal override outside the season window', () => {
    const id = resolveEffectivePresetId(
      { experiencePreset: 'luxury-glass' },
      { seasonStartMonth: 3, seasonEndMonth: 6, seasonalPresetOverride: 'skin-glow' },
      new Date('2026-11-01') // November — outside March-June
    );
    expect(id).toBe('luxury-glass');
  });

  it('handles a wraparound season window (e.g. Nov-through-Feb)', () => {
    const id = resolveEffectivePresetId(
      { experiencePreset: 'luxury-glass' },
      { seasonStartMonth: 11, seasonEndMonth: 2, seasonalPresetOverride: 'hair-luxury' },
      new Date('2026-12-25') // December — inside Nov-Feb wraparound
    );
    expect(id).toBe('hair-luxury');
  });

  it('applies the campaign preset while inside the festival date range', () => {
    const id = resolveEffectivePresetId(
      { experiencePreset: 'luxury-glass' },
      { dateRangeStart: '2026-10-01', dateRangeEnd: '2026-10-05', campaignPreset: 'weight-wellness' },
      new Date('2026-10-03')
    );
    expect(id).toBe('weight-wellness');
  });

  it('does not apply the campaign preset outside the festival date range', () => {
    const id = resolveEffectivePresetId(
      { experiencePreset: 'luxury-glass' },
      { dateRangeStart: '2026-10-01', dateRangeEnd: '2026-10-05', campaignPreset: 'weight-wellness' },
      new Date('2026-11-01')
    );
    expect(id).toBe('luxury-glass');
  });

  it('runs through the end of the campaign end date, not the start of it', () => {
    const id = resolveEffectivePresetId(
      { experiencePreset: 'luxury-glass' },
      { dateRangeStart: '2026-10-01', dateRangeEnd: '2026-10-05', campaignPreset: 'weight-wellness' },
      new Date('2026-10-05T18:00:00.000Z') // late on the last day — still within range
    );
    expect(id).toBe('weight-wellness');
  });

  it('campaign preset wins over seasonal preset when both windows are active', () => {
    const id = resolveEffectivePresetId(
      { experiencePreset: 'luxury-glass' },
      {
        seasonStartMonth: 3, seasonEndMonth: 12, seasonalPresetOverride: 'skin-glow',
        dateRangeStart: '2026-10-01', dateRangeEnd: '2026-10-05', campaignPreset: 'weight-wellness',
      },
      new Date('2026-10-03') // inside both windows
    );
    expect(id).toBe('weight-wellness');
  });

  it('resolveExperience end-to-end reflects the seasonal override, not the base preset', () => {
    const resolved = resolveExperience(
      {
        experiencePreset: 'corporate', // glassBlur: 'none', isDark: true
        smartRules: { seasonStartMonth: 1, seasonEndMonth: 12, seasonalPresetOverride: 'weight-wellness' },
      },
      new Date('2026-06-15')
    );
    expect(resolved.isDark).toBe(false); // weight-wellness, not corporate's dark theme
    expect(resolved.glassBlur).toBe('md'); // weight-wellness's own glassBlur, not corporate's 'none'
  });
});

describe('getAnimationDurations — animation speed mapping', () => {
  it('returns distinct durations for slow/normal/fast', () => {
    const slow = getAnimationDurations('slow');
    const normal = getAnimationDurations('normal');
    const fast = getAnimationDurations('fast');
    expect(slow.gradient).not.toBe(normal.gradient);
    expect(normal.gradient).not.toBe(fast.gradient);
  });

  it('normal speed matches the original hardcoded durations (no regression for legacy banners)', () => {
    const normal = getAnimationDurations('normal');
    expect(normal.gradient).toBe('18s');
    expect(normal.particle).toBe('9s');
  });
});
