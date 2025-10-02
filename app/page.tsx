import { redirect } from 'next/navigation';

export default function HomePage() {
  // Always redirect to login - let the login page handle auth checking
  redirect('/login');
}