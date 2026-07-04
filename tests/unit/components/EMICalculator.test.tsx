import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EMICalculator from '@/app/components/EMICalculator';

describe('EMICalculator', () => {
  it('renders the toggle header', () => {
    render(<EMICalculator price={10000} />);
    expect(screen.getByText('Make It Affordable — EMI Options')).toBeInTheDocument();
  });

  it('does not show EMI grid until expanded', () => {
    render(<EMICalculator price={10000} />);
    expect(screen.queryByText('3 Months')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', () => {
    render(<EMICalculator price={10000} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('3 Months')).toBeInTheDocument();
    expect(screen.getByText('6 Months')).toBeInTheDocument();
    expect(screen.getByText('12 Months')).toBeInTheDocument();
    expect(screen.getByText('24 Months')).toBeInTheDocument();
  });

  it('hides slider when price is ≤ 3000', () => {
    render(<EMICalculator price={2000} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Adjust Price')).not.toBeInTheDocument();
  });

  it('shows slider when price is > 3000', () => {
    render(<EMICalculator price={8000} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Adjust Price')).toBeInTheDocument();
  });

  it('shows 0% interest highlight when expanded', () => {
    render(<EMICalculator price={5000} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/0% interest available/i)).toBeInTheDocument();
  });

  it('collapses when header is clicked again', () => {
    render(<EMICalculator price={5000} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(screen.getByText('3 Months')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText('3 Months')).not.toBeInTheDocument();
  });
});
