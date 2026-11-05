import type { ILegalSection } from '@/app/models/LegalContent';

// Unresolved facts stay visible in the text, and the public page won't render a
// section that still contains this marker, so a draft saved by accident stays hidden.
export const DRAFT_MARKER = '[TO CONFIRM';

export function isPublishableSection(section: { bodyHtml?: string; title?: string }) {
  return !`${section.title ?? ''} ${section.bodyHtml ?? ''}`.includes(DRAFT_MARKER);
}

// Starting points for Admin -> Legal. Not legal advice, and not live until a lawyer
// has approved the wording and the clinic has resolved each marker. Security
// statements are limited to controls confirmed in this codebase.
export const PRIVACY_DRAFT_SECTIONS: ILegalSection[] = [
  {
    id: 'informed-consent',
    icon: '📝',
    title: 'Informed Consent',
    bodyHtml:
      '<p>No treatment is carried out without a prior consultation and your informed consent.</p>' +
      '<p>Your doctor will explain the proposed treatment, its purpose, and its possible risks, limitations and alternatives, so you can ask questions before you decide. You may decline.</p>' +
      '<p>Consent is recorded as follows: [TO CONFIRM: how and when the clinic records consent, and who keeps the form].</p>' +
      '<p>Agreeing to treatment is separate from agreeing to marketing messages, and separate from any use of your photographs. Each is asked for on its own.</p>',
  },
  {
    id: 'clinical-photography',
    icon: '📷',
    title: 'Clinical Photographs and External Publication',
    bodyHtml:
      '<p><strong>Clinical photographs.</strong> With your consent, we may take photographs to support diagnosis and to track your progress. These form part of your treatment record, are kept as described under Data Retention, and are available only to those involved in your care.</p>' +
      '<p><strong>External publication.</strong> Showing your image, story or testimonial outside your care, such as on our website, on social media or in advertising, is a different matter. Consent to treatment or to clinical photographs does not give permission for publication.</p>' +
      '<p>Patient consent does not by itself make promotional use of photographs or testimonials permissible. Any external use must also be allowed by the rules that apply to medical advertising.</p>' +
      '<p>[TO CONFIRM: whether the clinic publishes patient images at all, in what circumstances, and how identity is protected.]</p>' +
      '<p>Declining does not affect your care. [TO CONFIRM: how to withdraw permission and remove published content, consistent with the Terms of Service.]</p>',
  },
  {
    id: 'confidentiality-security',
    icon: '🔐',
    title: 'Patient Confidentiality and Data Security',
    bodyHtml:
      '<p>We treat what you share with us in confidence. It is disclosed only where the law requires it, or where you have agreed.</p>' +
      '<p>On our website and staff systems:</p>' +
      '<ul>' +
      '<li>Connections to our website use HTTPS.</li>' +
      '<li>Staff sign in to our booking and patient systems with individual accounts, with access based on their role.</li>' +
      '<li>Staff can use two-step sign-in, and staff changes in the system are logged.</li>' +
      '</ul>' +
      '<p>[TO CONFIRM: clinic practices for paper records, devices, staff training and confidentiality agreements, backups, service provider agreements, and responding to a data breach. List only what the clinic actually does.]</p>' +
      '<p>No system can be guaranteed completely secure. If you are concerned about your data, please contact us using the details on this page.</p>',
  },
];
