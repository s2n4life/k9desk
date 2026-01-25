import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Star, ArrowRight, Zap, Shield, Calendar, Users } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-900">

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-brand-primary/5 pt-8 pb-20 lg:pt-16 lg:pb-28">
                <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">

                    {/* Public Nav */}
                    <nav className="relative flex items-center justify-between py-4 mb-8 max-w-screen-2xl mx-auto border-b border-gray-100/50" aria-label="Global">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
                                <span className="text-xl font-bold tracking-tight text-gray-800">K9desk</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-8">
                            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                                Log in
                            </Link>
                            <Link href="/signup" className="text-sm font-bold bg-brand-primary !text-white px-6 py-3 rounded-lg hover:bg-brand-primary/90 transition-all shadow-sm hover:shadow-md">
                                Start Free Trial
                            </Link>
                        </div>
                    </nav>

                    <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
                        <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-7 lg:text-left lg:max-w-none">
                            <h1 className="text-4xl tracking-tight font-extrabold text-brand-primary sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                                Run Your Mobile Grooming Business From The <span className="text-brand-secondary">Front Seat.</span>
                            </h1>
                            <p className="mt-6 text-base text-gray-600 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-8 md:text-xl lg:mx-0 lg:max-w-2xl">
                                Stop playing phone tag. Stop manual reminders. Stop losing money to no-shows.
                            </p>
                            <div className="mt-8 flex flex-col items-center lg:items-center text-center sm:max-w-lg sm:mx-auto lg:mx-auto">
                                <Link href="/signup" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-full text-white bg-brand-secondary hover:bg-orange-600 md:text-lg md:px-10 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                                    Start Free Trial — Get My Time Back
                                    <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
                                </Link>
                                <p className="mt-3 text-sm text-gray-500">
                                    No credit card. Set up in under 60 seconds.
                                </p>
                            </div>
                        </div>

                        <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-5 lg:flex lg:items-center">
                            <div className="relative mx-auto w-full rounded-lg shadow-2xl lg:max-w-md overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
                                <Image
                                    src="/images/landing/hero.png"
                                    alt="Happy Dog Groomer"
                                    width={600}
                                    height={800}
                                    className="w-full h-auto object-cover"
                                    priority
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* The Problem (Agitation) */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 text-center max-w-4xl">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">Is This You?</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <Zap size={24} />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Driving & Texting?</h3>
                            <p className="text-gray-600">Trying to reply to “Can you fit Bella in?” while merging onto the highway.</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <Calendar size={24} />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Calendar Chaos?</h3>
                            <p className="text-gray-600">Double bookings. Missed payments. Sitting in a driveway for a no-show.</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <Shield size={24} />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Burnout Is Real.</h3>
                            <p className="text-gray-600">You’re not just a groomer. You’re the scheduler, accountant, and driver. And you’re exhausted.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Solution */}
            <section className="py-20 bg-white">
                <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-brand-primary font-semibold tracking-wide uppercase text-sm">Introducing The "Anti-Stress" Engine</h2>
                        <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Meet K9desk: Your Digital Front Desk.
                        </h3>
                        <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
                            It runs the busywork so you can focus on the dogs — and the money.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-white" />}
                            title="1-Click Quick Texts"
                            desc="Send reminders, updates, and payment requests in seconds — without typing while driving."
                        />
                        <FeatureCard
                            icon={<Calendar className="w-6 h-6 text-white" />}
                            title="Lead Capture Agent"
                            desc="A simple booking page collects requests while you’re working. You approve and schedule them on your terms."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-white" />}
                            title="Revenue Tracking"
                            desc="See who’s paid, who hasn’t, and what’s still outstanding — without spreadsheets or guesswork."
                        />
                        <FeatureCard
                            icon={<Star className="w-6 h-6 text-white" />}
                            title="Reputation Booster"
                            desc="Finish the job and instantly send a review link. Turn happy clients into 5-star reviews automatically."
                        />
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-16 bg-gray-900 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-12">Join The 1% of Mobile Groomers</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <Testimonial
                            quote="“I used to spend 2 hours a night texting clients. Now I spend 2 minutes. My revenue went up 30% in month one.”"
                            author="Sarah, Mobile Groomer · Austin, TX"
                        />
                        <Testimonial
                            quote="“The best $49 I spend every month. It pays for itself with one avoided no-show.”"
                            author="Mike, Owner · K9 Cuts"
                        />
                        <Testimonial
                            quote="“Finally an app that actually works on my phone while I’m in the van.”"
                            author="Jessica, Mobile Groomer · Phoenix, AZ"
                        />
                    </div>
                </div>
            </section>

            {/* Pricing / Offer */}
            <section className="py-20 bg-brand-primary/5">
                <div className="container mx-auto px-4 max-w-lg">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-8 sm:p-10 sm:pb-6 text-center">
                            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-brand-primary/10 text-brand-primary rounded-full mb-4">
                                Pilot Program
                            </span>
                            <h2 className="text-3xl font-extrabold text-gray-900">
                                Run Your Business
                            </h2>
                            <p className="mt-4 text-brand-primary font-medium italic">
                                Most groomers make this back with one avoided no-show.
                            </p>
                            <div className="mt-4 flex justify-center items-baseline text-6xl font-extrabold text-brand-secondary">
                                $49
                                <span className="ml-1 text-2xl font-medium text-gray-500">/mo</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-400 line-through">$99/mo standard price</p>
                        </div>
                        <div className="px-6 pt-6 pb-8 bg-gray-50 sm:p-10 sm:pt-6">
                            <ul className="space-y-4">
                                <PricingFeature text="Full CRM Access" />
                                <PricingFeature text="Unlimited Quick-Text Templates" />
                                <PricingFeature text="Online Booking Page" />
                                <PricingFeature text="Payment Logging & Tracking" />
                                <PricingFeature text="Priority Support" />
                            </ul>
                            <div className="mt-8">
                                <Link href="/signup" className="block w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-secondary hover:bg-orange-600 shadow transition">
                                    Claim My Spot — Start Free Trial
                                </Link>
                                <p className="mt-4 text-center text-xs text-gray-500">
                                    Only 50 spots available this month.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final Trust Line */}
            <div className="bg-white py-8 border-t border-gray-100">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-lg font-medium text-gray-700">
                        Built specifically for mobile groomers — not salons, not franchises.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-gray-100">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-medium text-gray-500">
                        <Link href="/terms" className="hover:text-brand-primary transition-colors">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-brand-primary transition-colors">Privacy Policy</Link>
                        <Link href="/contact" className="hover:text-brand-primary transition-colors">Contact Support</Link>
                    </div>
                    <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} K9desk. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex flex-col items-start p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-brand-primary text-white mb-5">
                {icon}
            </div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-2 text-base text-gray-500">{desc}</p>
        </div>
    );
}

function Testimonial({ quote, author }: { quote: string, author: string }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-center mb-4 text-yellow-400">
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
            </div>
            <p className="text-lg italic mb-4">"{quote}"</p>
            <p className="font-semibold text-brand-primary">{author}</p>
        </div>
    );
}

function PricingFeature({ text }: { text: string }) {
    return (
        <li className="flex items-start">
            <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <p className="ml-3 text-base text-gray-700">{text}</p>
        </li>
    );
}
