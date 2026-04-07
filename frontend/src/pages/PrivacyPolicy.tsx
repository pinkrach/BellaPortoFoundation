import { Mail, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { WaveDivider } from "@/components/WaveDivider";

const sections = [
  {
    title: "1. Who We Are",
    body: [
      "Bella Porto is a nonprofit support platform designed to help administrators manage resident cases and provide donors with transparent insight into how their contributions support children and families in need.",
    ],
    bullets: [
      "donor dashboards",
      "guest and registered donation tools",
      "administrative dashboards",
      "resident case inventory systems",
      "reporting and analytics tools",
    ],
  },
  {
    title: "2. Information We Collect",
    subtitle: "Donor and Public User Information",
    body: ["Guest donors may provide donation-related information without creating an account."],
    bullets: [
      "full name",
      "email address",
      "phone number",
      "mailing address",
      "donation amount and donation history",
      "account login credentials",
      "communication preferences",
      "IP address and browser/device information",
      "website usage and analytics data",
    ],
  },
  {
    title: "3. Resident and Case Management Information",
    body: [
      "Because our platform supports child welfare and nonprofit case management, we process restricted resident information including:",
      "Some of this information may constitute special category personal data under GDPR, particularly information related to minors, health, disability, abuse history, and social services involvement.",
      "Access to this information is strictly limited to authorized personnel.",
    ],
    bullets: [
      "resident ID numbers",
      "case control numbers",
      "internal reference codes",
      "sex and date of birth",
      "birth status and place of birth",
      "religion",
      "case category",
      "abuse, trafficking, labor, or at-risk indicators",
      "disability and special-needs information",
      "family status and social support indicators",
      "safehouse placement",
      "social worker assignments",
      "admission and case closure dates",
      "reintegration and risk level data",
      "restricted case notes",
    ],
  },
  {
    title: "4. How We Collect Data",
    body: ["We may also receive data from authorized nonprofit staff, case workers, or partner organizations."],
    bullets: [
      "create an account",
      "make a donation",
      "submit a contact form",
      "access dashboards",
      "upload forms or documents",
      "interact with case management tools",
      "use our website through browser session technologies and analytics tools",
    ],
  },
  {
    title: "5. How We Use Your Data",
    body: ["We do not sell personal information."],
    bullets: [
      "process donations",
      "manage donor accounts",
      "provide donor dashboards and impact reporting",
      "manage resident cases",
      "support case assignment and risk tracking",
      "match donor contributions to organizational needs",
      "improve administrative workflows",
      "monitor system security",
      "perform analytics and reporting",
      "comply with legal and safeguarding obligations",
    ],
  },
  {
    title: "6. Legal Basis for Processing (GDPR)",
    body: [
      "For EU users, we process data under the following legal bases:",
      "Special-category resident data is processed only where necessary for safeguarding, legal compliance, and authorized nonprofit case management purposes.",
    ],
    bullets: [
      "consent for optional communications and donor updates",
      "performance of a contract for donation processing and account services",
      "legal obligation for recordkeeping and safeguarding compliance",
      "legitimate interest for platform administration, fraud prevention, and service improvement",
      "vital interests / public interest where child safeguarding or welfare concerns apply",
    ],
  },
  {
    title: "7. Data Sharing",
    body: ["Third-party providers only receive the minimum information necessary to perform their services."],
    bullets: [
      "Azure for cloud hosting and data storage",
      "Vercel for website hosting and deployment",
      "PayPal / Venmo or similar payment processors for donation processing",
      "authorized nonprofit staff and case administrators",
    ],
  },
  {
    title: "8. International Transfers",
    body: [
      "Because our platform may serve users in both the European Union and the United States, data may be transferred across jurisdictions.",
      "Where required, appropriate safeguards are implemented to ensure GDPR-compliant protection of personal data.",
    ],
  },
  {
    title: "9. Data Retention",
    body: [
      "To minimize risk, we retain data only as long as necessary.",
      "After these periods, data is securely deleted or anonymized.",
    ],
    bullets: [
      "donor guest transaction data: 2 years",
      "donor account data: 3 years after inactivity",
      "payment confirmation records: 5 years",
      "resident case files: 5 years after case closure",
      "restricted safeguarding notes: 7 years after closure",
      "analytics/session data: 12 months",
    ],
  },
  {
    title: "10. Cookies and Analytics",
    body: ["Users may manage cookies through their browser settings."],
    bullets: [
      "secure login sessions",
      "remembering user preferences",
      "analytics and website performance",
      "fraud prevention",
    ],
  },
  {
    title: "11. Your Rights",
    body: ["Under GDPR and applicable U.S. privacy laws, users may request:"],
    bullets: [
      "access to personal data",
      "correction of inaccurate data",
      "deletion where legally permitted",
      "restriction of processing",
      "objection to processing",
      "data portability",
      "withdrawal of consent",
    ],
  },
  {
    title: "12. Protection of Children’s Data",
    body: [
      "Because the platform contains information relating to minors and vulnerable individuals, Bella Porto applies heightened security and access controls.",
      "Only authorized administrators, employees, and approved case personnel may access resident records.",
      "Sensitive case data is never made available to donors or the public.",
    ],
  },
  {
    title: "13. Security Measures",
    body: ["We implement reasonable administrative, technical, and organizational safeguards including:"],
    bullets: [
      "role-based access controls",
      "encrypted cloud storage",
      "secure authentication",
      "access logging",
      "restricted administrative permissions",
      "periodic review of sensitive records",
    ],
  },
  {
    title: "14. Changes to This Notice",
    body: ["We may update this Privacy Notice periodically. Updated versions will be posted on this page with a revised effective date."],
  },
];

const PrivacyPolicy = () => (
  <PublicLayout>
    <section className="relative bg-gradient-to-r from-primary to-lavender py-16 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground/90 mb-5">
          <ShieldCheck className="h-4 w-4" />
          Privacy & Data Protection
        </div>
        <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground">Privacy Policy</h1>
        <p className="mt-4 max-w-3xl text-primary-foreground/85 text-lg">
          Bella Porto ("we," "our," or "us") is committed to protecting the privacy and security of all individuals
          whose information is processed through our platform, including donors, administrators, employees, residents,
          and other authorized users.
        </p>
        <p className="mt-3 text-sm text-primary-foreground/75">Last Updated: April 6, 2026</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <WaveDivider className="text-background" />
      </div>
    </section>

    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-warm mb-8">
          <p className="text-muted-foreground leading-relaxed">
            This Privacy Notice explains how we collect, use, store, and protect personal information when you access
            our website, donor dashboard, administrative portal, and case inventory system.
          </p>
          <p className="mt-4 text-muted-foreground">
            For privacy-related questions, contact{" "}
            <a className="text-primary font-medium hover:underline" href="mailto:privacy@bellaporto.org">
              privacy@bellaporto.org
            </a>
            .
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <article key={section.title} className="bg-card rounded-2xl p-6 md:p-8 shadow-warm">
              <h2 className="font-heading text-2xl font-bold text-foreground">{section.title}</h2>
              {section.subtitle ? (
                <h3 className="mt-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                  {section.subtitle}
                </h3>
              ) : null}

              {section.body?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}

              {section.bullets?.length ? (
                <ul className="mt-4 grid gap-2 md:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-8 bg-gradient-to-r from-coral/10 to-lavender/20 rounded-2xl p-6 md:p-8">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-heading text-xl font-semibold text-foreground">Privacy Requests</h3>
              <p className="mt-2 text-muted-foreground">
                To submit an access, correction, deletion, or consent-withdrawal request, email{" "}
                <a className="text-primary font-medium hover:underline" href="mailto:privacy@bellaporto.org">
                  privacy@bellaporto.org
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </PublicLayout>
);

export default PrivacyPolicy;
