import { render, screen } from '@testing-library/react';
import App from './App';

test('renders task manager heading', () => {
  render(<App />);
  const heading = screen.getByText(/Task Manager/i);
  expect(heading).toBeInTheDocument();
});
