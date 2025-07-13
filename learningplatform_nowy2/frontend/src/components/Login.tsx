import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const { register, login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        await register(email, password, displayName, role);
      } else {
        await login(email, password);
      }
      router.push('/homelogin');
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <div>
      <h2>{isRegistering ? 'Rejestracja' : 'Logowanie'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {isRegistering && (
          <>
            <input
              type="text"
              placeholder="Imię i nazwisko"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Uczeń</option>
              <option value="teacher">Nauczyciel</option>
            </select>
          </>
        )}
        <button type="submit">{isRegistering ? 'Zarejestruj' : 'Zaloguj'}</button>
      </form>
      <button onClick={() => setIsRegistering(!isRegistering)}>
        {isRegistering ? 'Przejdź do logowania' : 'Przejdź do rejestracji'}
      </button>
    </div>
  );
};

export default Login; 