'use client';

interface Props {
  whatsappText?: string;
  emailText?: string;
  backToTopLabel?: string;
}

export default function FloatingButtons({
  whatsappText = 'Contact us on WhatsApp',
  emailText = 'Send us an email',
  backToTopLabel = 'Back to top',
}: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* WhatsApp */}
      <a
        href="https://wa.me/message/HPPZ5X6XZSMLM1"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.477 2 2 6.477 2 12c0 2.038.552 3.94 1.511 5.584L2 22l4.416-1.511A9.952 9.952 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
        {whatsappText}
      </a>

      {/* Email */}
      <a
        href="mailto:david@sinotradecompliance.com"
        className="flex items-center gap-2 px-4 py-2 bg-white text-[#1B365D] text-sm font-medium rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-gray-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {emailText}
      </a>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex items-center justify-center w-10 h-10 bg-[#1B365D] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
        aria-label={backToTopLabel}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
