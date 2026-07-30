import ZoneEffectsShell from './ZoneEffectsShell';
import type { ISection } from '@/app/models/Section';

const SPACING_CLASS: Record<string, string> = {
  none: '',
  compact: 'py-4',
  default: 'py-8 md:py-12',
  loose: 'py-16 md:py-24',
};

const BACKGROUND_CLASS: Record<string, string> = {
  transparent: '',
  light: 'bg-gray-50',
  dark: 'bg-[#0B2560] text-white',
  brand: 'bg-[#f6faff]',
};

type WrapperFields = Pick<
  ISection,
  | 'desktopVisible'
  | 'tabletVisible'
  | 'mobileVisible'
  | 'spacing'
  | 'background'
  | 'theme'
  | 'sticky'
  | 'animationPreset'
  | 'collapsible'
>;

// Every field here is either a plain Tailwind class (visibility, spacing,
// background, sticky — zero JS, zero hydration cost) or delegated to the one
// client shell that animation/collapsible genuinely require. Nothing here
// touches the leaf component's own markup or internal wrapper.
export default function ZoneWrapper({
  section,
  selfAnimates,
  label,
  children,
}: {
  section: WrapperFields;
  selfAnimates?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  const visibilityClass = [
    section.mobileVisible ? '' : 'hidden',
    section.tabletVisible ? 'md:block' : 'md:hidden',
    section.desktopVisible ? 'lg:block' : 'lg:hidden',
  ].join(' ');

  const outerClass = [
    visibilityClass,
    SPACING_CLASS[section.spacing] ?? '',
    BACKGROUND_CLASS[section.background] ?? '',
    section.sticky ? 'lg:sticky lg:top-24' : '',
  ].filter(Boolean).join(' ');

  const needsClientShell = section.collapsible || (section.animationPreset !== 'none' && !selfAnimates);

  const content = needsClientShell ? (
    <ZoneEffectsShell
      animationPreset={section.animationPreset}
      skipAnimation={selfAnimates}
      collapsible={section.collapsible}
      label={label}
    >
      {children}
    </ZoneEffectsShell>
  ) : children;

  return <div className={outerClass}>{content}</div>;
}
