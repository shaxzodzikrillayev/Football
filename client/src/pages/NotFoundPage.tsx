import { Link } from 'react-router-dom';
import { Home, ShieldAlert } from 'lucide-react';
import ClubLogo from '../components/ClubLogo';

export default function NotFoundPage() {
  return (
    <main
      className="auth"
      style={{ textAlign: 'center' }}
    >
      <div className="auth__card" style={{ maxWidth: 520 }}>
        <div className="auth__logo">
          <ClubLogo size={64} showText={false} />
        </div>
        <h1 className="auth__title">404</h1>
        <p className="auth__subtitle">
          <ShieldAlert size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Такой страницы не существует
        </p>
        <Link className="btn btn--gold" to="/" style={{ marginTop: 10 }}>
          <Home size={16} /> На главную
        </Link>
      </div>
    </main>
  );
}
