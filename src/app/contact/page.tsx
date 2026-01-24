import Link from 'next/link';
import { ChevronLeft, Mail, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <Link href="/" className="inline-flex items-center text-sm text-brand-primary mb-8 hover:underline">
                    <ChevronLeft size={16} className="mr-1" />
                    Back to Home
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>
                <p className="text-gray-600 mb-12">Have questions or need support? We're here to help you get the most out of K9Desk.</p>

                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-brand-primary/10 rounded-lg text-brand-primary">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Email</h3>
                                <p className="text-gray-600">support@k9desk.com</p>
                                <p className="text-sm text-gray-500 mt-1">We typically reply within 24 hours.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-brand-primary/10 rounded-lg text-brand-primary">
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Phone</h3>
                                <p className="text-gray-600">(555) 123-4567</p>
                                <p className="text-sm text-gray-500 mt-1">Monday - Friday, 9am - 5pm CST.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-brand-primary/10 rounded-lg text-brand-primary">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Office</h3>
                                <p className="text-gray-600">Kinetix Apps LLC</p>
                                <p className="text-sm text-gray-500 mt-1">Austin, Texas, USA</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Quick Help</h3>
                        <p className="text-sm text-gray-600 mb-6">Check our FAQ or documentation for even faster answers to common questions.</p>
                        <button className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg hover:bg-brand-primary/90 transition-all shadow-sm">
                            View Help Center
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
