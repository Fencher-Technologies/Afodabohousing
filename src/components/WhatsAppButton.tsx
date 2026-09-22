import { useLocation } from 'react-router-dom';

const WHATSAPP_NUMBER = '256789590007';

/**
 * Floating WhatsApp button for house seekers and managers who would rather
 * ask a question than fill in a form.
 *
 * Only on public pages: inside the dashboard people already have their
 * manager's or tenant's contact details, and the button would sit on top of
 * the content there.
 */
const HIDDEN_PREFIXES = ['/dashboard', '/account', '/manager', '/tenant', '/admin'];

export default function WhatsAppButton() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const message = encodeURIComponent('Hello Axis Housing, I would like to ask about');
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Axis Housing on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 md:h-16 md:w-16"
    >
      {/* Inline mark: no extra request, and it stays crisp at any size. */}
      <svg viewBox="0 0 32 32" className="h-7 w-7 md:h-8 md:w-8" fill="currentColor" aria-hidden="true">
        <path d="M16.004 0h-.008C7.174 0 .002 7.174.002 16c0 3.5 1.128 6.744 3.046 9.376L1.05 31.2l6.02-1.924A15.9 15.9 0 0 0 16.004 32C24.83 32 32 24.826 32 16S24.83 0 16.004 0Zm9.31 22.594c-.386 1.09-1.918 1.994-3.14 2.258-.836.178-1.928.32-5.604-1.204-4.702-1.948-7.73-6.726-7.966-7.036-.226-.31-1.9-2.53-1.9-4.826 0-2.296 1.166-3.424 1.636-3.904.386-.394.938-.574 1.468-.574.172 0 .326.008.464.016.422.018.634.042.912.708.346.834 1.19 2.93 1.29 3.142.102.212.204.5.06.81-.134.32-.252.446-.464.69-.212.244-.414.43-.626.692-.194.228-.414.472-.17.894.244.414 1.086 1.788 2.326 2.894 1.6 1.424 2.898 1.878 3.364 2.072.346.144.76.11 1.014-.16.322-.348.72-.924 1.124-1.492.288-.406.652-.456 1.034-.312.39.136 2.476 1.166 2.9 1.376.424.212.704.314.806.492.1.178.1 1.014-.286 2.104l-.002-.002Z" />
      </svg>
    </a>
  );
}
