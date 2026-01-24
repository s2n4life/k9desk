import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <Link href="/" className="inline-flex items-center text-sm text-brand-primary mb-8 hover:underline">
                    <ChevronLeft size={16} className="mr-1" />
                    Back to Home
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
                <p className="text-sm text-gray-500 mb-8">Last Updated: January 24, 2026</p>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing or using K9Desk, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
                        <p>K9Desk provides a CRM and scheduling platform for mobile dog groomers. We reserve the right to modify or discontinue any part of the service at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Subscriptions and Payments</h2>
                        <p>Our service is billed on a subscription basis. You agree to provide a valid payment method and authorize us to charge the applicable fees. All payments are processed via Stripe.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Limitation of Liability</h2>
                        <p>K9Desk is provided "as is" without warranties of any kind. In no event shall K9Desk or Kinetix Apps LLC be liable for any indirect, incidental, or consequential damages.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Termination</h2>
                        <p>We may terminate or suspend your account at our sole discretion, without prior notice, for conduct that we believe violates these Terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Governing Law</h2>
                        <p>These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes shall be resolved in the appropriate courts.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
