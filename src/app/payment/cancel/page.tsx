import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                    <XCircle size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Canceled</h1>
                <p className="text-slate-600 mb-8">
                    Your payment process was canceled. No charges were made.
                </p>
                <Link
                    href="/"
                    className="block w-full bg-slate-200 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-300 transition"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}
