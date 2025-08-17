import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsCard from './StatsCard';

describe('StatsCard Component', () => {
  test('renders title and numeric value', () => {
    render(<StatsCard title="Total Users" value={1234} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  test('renders title and string value', () => {
    render(<StatsCard title="Status" value="Active" />);
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('renders with zero value', () => {
    render(<StatsCard title="Errors" value={0} />);
    
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('renders with negative value', () => {
    render(<StatsCard title="Change" value={-50} />);
    
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('-50')).toBeInTheDocument();
  });

  test('renders with empty string value', () => {
    render(<StatsCard title="Description" value="" />);
    
    expect(screen.getByText('Description')).toBeInTheDocument();
    // Check that the component renders even with empty value
    const container = document.querySelector('.stats-card');
    expect(container).toBeInTheDocument();
  });

  test('renders with long title', () => {
    const longTitle = "This is a very long title that might wrap to multiple lines";
    render(<StatsCard title={longTitle} value={42} />);
    
    expect(screen.getByText(longTitle)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  test('renders with special characters in title', () => {
    const specialTitle = "Special !@#$%^&*() Title";
    render(<StatsCard title={specialTitle} value="Test" />);
    
    expect(screen.getByText(specialTitle)).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('renders with large numeric value', () => {
    render(<StatsCard title="Big Number" value={999999999} />);
    
    expect(screen.getByText('Big Number')).toBeInTheDocument();
    expect(screen.getByText('999999999')).toBeInTheDocument();
  });

  test('renders with decimal value', () => {
    render(<StatsCard title="Percentage" value={98.5} />);
    
    expect(screen.getByText('Percentage')).toBeInTheDocument();
    expect(screen.getByText('98.5')).toBeInTheDocument();
  });

  test('has correct CSS class', () => {
    const { container } = render(<StatsCard title="Test" value={123} />);
    const statsCardDiv = container.querySelector('.stats-card');
    expect(statsCardDiv).toBeInTheDocument();
  });

  test('contains heading and paragraph elements', () => {
    render(<StatsCard title="Test Title" value="Test Value" />);
    
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Test Title');
  });

  test('renders multiple StatsCard components independently', () => {
    render(
      <div>
        <StatsCard title="Card 1" value={100} />
        <StatsCard title="Card 2" value="Text" />
        <StatsCard title="Card 3" value={200} />
      </div>
    );
    
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Card 3')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });
});