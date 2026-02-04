import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Alcohol Origins',
  description: 'Privacy Policy for Alcohol Origins.',
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 4, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Overview</h2>
          <p>
            Alcohol Origins collects and uses data to provide account access, community beverage
            submissions, moderation workflows, and map functionality.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
          <p>
            We may collect account information (such as email and profile details), beverage
            submission content, moderation actions, and basic usage data needed for security and
            product operations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">How We Use Information</h2>
          <p>
            We use collected data to operate the platform, review and publish submissions, prevent
            abuse, enforce policies, and improve reliability and user experience.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Data Sharing</h2>
          <p>
            We do not sell personal information. Data may be shared with service providers that
            support hosting, authentication, analytics, and security, only as needed to run the
            service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Retention</h2>
          <p>
            We retain data for as long as needed to operate the service, comply with legal
            obligations, resolve disputes, and maintain audit history for moderation and revisions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Your Choices</h2>
          <p>
            You can request account updates or deletion where applicable. Some data may be retained
            for legal, security, or moderation recordkeeping purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>
            For privacy-related requests, contact the project team through the support channel used
            for this application.
          </p>
        </section>

        <p>
          Also review our{' '}
          <Link href="/terms-of-service" className="text-brand-green hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
