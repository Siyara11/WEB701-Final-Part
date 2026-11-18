// App.test.js - front-end smoke tests (React Testing Library)
import { render, screen, fireEvent } from '@testing-library/react';

// Replace network modules so the tests run without a server
jest.mock('socket.io-client', () => ({ io: () => ({ on: jest.fn(), off: jest.fn() }) }));
jest.mock('axios', () => ({
  create: () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn(),
    interceptors: { request: { use: jest.fn() } } })
}));

const App = require('./App').default;

test('shows the login form when no user is logged in', () => {
  localStorage.clear();
  render(<App />);
  expect(screen.getByText('Login to your account')).toBeInTheDocument();
});

test('switches to the registration form with a role selector', () => {
  localStorage.clear();
  render(<App />);
  fireEvent.click(screen.getByText('Register here'));
  expect(screen.getByText('Create an account')).toBeInTheDocument();
  expect(screen.getByRole('combobox')).toBeInTheDocument();
});
