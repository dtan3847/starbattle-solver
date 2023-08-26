import { render, screen } from '@testing-library/react';
import StarBattlePuzzle from './puzzle';

test('renders learn react link', () => {
  render(<StarBattlePuzzle />);
  const linkElement = screen.getByText(/Save Puzzle/i);
  expect(linkElement).toBeInTheDocument();
});
