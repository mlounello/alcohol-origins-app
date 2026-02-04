import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Alcohol Origins',
  description: 'Terms of Service for Alcohol Origins.',
};

export default function TermsOfServicePage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 4, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Acceptance of Terms</h2>
          <p>
            By accessing or using Alcohol Origins, you agree to these Terms of Service and any
            applicable policies referenced by this page.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">User Accounts</h2>
          <p>
            You are responsible for your account activity and for maintaining accurate information.
            You must not share credentials or use another user&apos;s account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Community Contributions</h2>
          <p>
            Submissions must be accurate and lawful. Contributors must not post misleading,
            abusive, or infringing content. Moderators may reject, edit, or remove content that
            violates policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Moderation and Enforcement</h2>
          <p>
            Admins, moderators, and editors may review and act on submissions. Accounts may be
            restricted or banned for policy violations or abuse prevention.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Availability and Changes</h2>
          <p>
            The service may change, be suspended, or updated at any time. We may also revise these
            terms; continued use after updates indicates acceptance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Disclaimer and Liability</h2>
          <p>
            The service is provided on an &quot;as is&quot; basis. To the fullest extent allowed by
            law, we disclaim warranties and limit liability for indirect or consequential damages.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>
            For questions about these terms, contact the project team through the support channel
            used for this application.
          </p>
        </section>

        <p>
          Please also read our{' '}
          <Link href="/privacy" className="text-brand-green hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
