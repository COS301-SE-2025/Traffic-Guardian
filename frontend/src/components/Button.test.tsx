import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from './Button';

describe('Button Component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders button with label', () => {
    render(<Button label="Test Button" onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /test button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Test Button');
  });

  test('calls onClick handler when clicked', () => {
    render(<Button label="Click Me" onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /click me/i });

    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('renders with default type "button"', () => {
    render(<Button label="Default Type" onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /default type/i });
    expect(button).toHaveAttribute('type', 'button');
  });

  test('renders with custom type "submit"', () => {
    render(<Button label="Submit" onClick={mockOnClick} type="submit" />);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
  });

  test('applies default className', () => {
    render(<Button label="Default Class" onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /default class/i });
    expect(button).toHaveClass('custom-button');
  });

  test('applies custom className along with default', () => {
    render(
      <Button
        label="Custom Class"
        onClick={mockOnClick}
        className="extra-class"
      />,
    );
    const button = screen.getByRole('button', { name: /custom class/i });
    expect(button).toHaveClass('custom-button');
    expect(button).toHaveClass('extra-class');
  });

  test('handles empty className prop', () => {
    render(<Button label="Empty Class" onClick={mockOnClick} className="" />);
    const button = screen.getByRole('button', { name: /empty class/i });
    expect(button).toHaveClass('custom-button');
    expect(button.className).toBe('custom-button ');
  });

  test('calls onClick multiple times when clicked multiple times', () => {
    render(<Button label="Multi Click" onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /multi click/i });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(3);
  });

  test('renders with special characters in label', () => {
    const specialLabel = 'Special !@#$%^&*() Characters';
    render(<Button label={specialLabel} onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: specialLabel });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(specialLabel);
  });

  test('renders with numeric label', () => {
    render(<Button label="123" onClick={mockOnClick} />);
    const button = screen.getByRole('button', { name: /123/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('123');
  });
});
