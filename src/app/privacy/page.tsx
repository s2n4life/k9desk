import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <Link href="/dashboard" className="inline-flex items-center text-sm text-brand-primary mb-8 hover:underline">
                    <ChevronLeft size={16} className="mr-1" />
                    Back to Dashboard
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mb-8">Last Updated: January 24, 2026</p>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us when you create an account, such as your name, email address, phone number, and business details including customer and pet information.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
                        <p>We use the information we collect to provide, maintain, and improve our services, including scheduling appointments, sending reminders, and processing payments through our third-party processors.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Sharing</h2>
                        <p>We do not sell your personal data. We share information with service providers like Stripe for payment processing and Supabase for cloud database hosting.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Your Security</h2>
                        <p>We implement industry-standard security measures to protect your information. However, no method of transmission over the Internet is 100% secure.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Contact Us</h2>
                        <p>If you have questions about this Privacy Policy, please contact us at support@k9desk.com.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
