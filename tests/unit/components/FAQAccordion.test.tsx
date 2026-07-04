import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FAQAccordion from '@/app/components/homepage/FAQAccordion';

const mockData = {
  headline: 'Frequently Asked Questions',
  viewAllText: 'View all FAQs',
  viewAllHref: '/faqs',
  faqs: [
    { question: 'Is laser treatment safe?', answer: 'Yes, it is safe when performed by a certified dermatologist.' },
    { question: 'How many sessions do I need?', answer: 'Typically 6-8 sessions for laser hair removal.' },
    { question: 'Do you offer EMI?', answer: 'Yes, 0% EMI on select cards.' },
  ],
};

describe('FAQAccordion', () => {
  it('renders the headline', () => {
    render(<FAQAccordion data={mockData} />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  it('renders all FAQ questions', () => {
    render(<FAQAccordion data={mockData} />);
    expect(screen.getByText('Is laser treatment safe?')).toBeInTheDocument();
    expect(screen.getByText('How many sessions do I need?')).toBeInTheDocument();
    expect(screen.getByText('Do you offer EMI?')).toBeInTheDocument();
  });

  it('shows first answer open by default', () => {
    render(<FAQAccordion data={mockData} />);
    expect(screen.getByText('Yes, it is safe when performed by a certified dermatologist.')).toBeInTheDocument();
  });

  it('opens another question when clicked', () => {
    render(<FAQAccordion data={mockData} />);
    fireEvent.click(screen.getByText('How many sessions do I need?'));
    expect(screen.getByText('Typically 6-8 sessions for laser hair removal.')).toBeInTheDocument();
  });

  it('closes open question when clicked again', () => {
    render(<FAQAccordion data={mockData} />);
    const firstQuestion = screen.getByText('Is laser treatment safe?');
    fireEvent.click(firstQuestion);
    expect(screen.queryByText('Yes, it is safe when performed by a certified dermatologist.')).not.toBeInTheDocument();
  });

  it('renders view all link pointing to /faqs', () => {
    render(<FAQAccordion data={mockData} />);
    const link = screen.getByText('View all FAQs →');
    expect(link.closest('a')).toHaveAttribute('href', '/faqs');
  });

  it('falls back to /faqs when viewAllHref is #', () => {
    render(<FAQAccordion data={{ ...mockData, viewAllHref: '#' }} />);
    const link = screen.getByText('View all FAQs →');
    expect(link.closest('a')).toHaveAttribute('href', '/faqs');
  });

  it('renders empty state gracefully with no faqs', () => {
    render(<FAQAccordion data={{ ...mockData, faqs: [] }} />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });
});
