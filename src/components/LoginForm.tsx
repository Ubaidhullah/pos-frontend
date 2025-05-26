import React, { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
// Assuming you have an AuthContext or similar to store user state
// import { useAuth } from '../contexts/AuthContext';

const LOGIN_MUTATION = gql`
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
      user {
        id
        email
        name
        role
      }
    }
  }
`;

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const { login: contextLogin } = useAuth(); // Example context login function

  const [loginUser, { data, loading, error }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      console.log('Login successful:', data.login);
      localStorage.setItem('accessToken', data.login.accessToken);
      // contextLogin(data.login.user); // Update global auth state
      // Redirect user or update UI
    },
    onError: (err) => {
      console.error('Login error:', err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginUser({ variables: { loginInput: { email, password } } });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {data && <p style={{ color: 'green' }}>Welcome, {data.login.user.name || data.login.user.email}!</p>}
    </form>
  );
}