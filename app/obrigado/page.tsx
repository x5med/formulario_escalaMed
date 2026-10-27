import type { Metadata } from 'next';
import { RegistrationSuccess } from '@/components/registration-success';

export const metadata: Metadata = { title: 'Próximos passos — EscalaMED', robots: { index: false, follow: false } };
// Same presentation as submission; no lead or conversion is created by visiting.
export default function ThankYouPage() { return <main><RegistrationSuccess /></main>; }
