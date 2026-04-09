import { Mail, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { WaveDivider } from "@/components/WaveDivider";

const sections = [
  {
    title: "1. Who We Are",
    body: [
      "Bella Bay is a nonprofit support platform designed to help administrators manage resident cases and provide donors with transparent insight into how their contributions support children and families in need.",
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
    body: [
      "We use cookies and similar browser storage technologies to keep the site secure, remember basic preferences, and understand website performance.",
      "Essential cookies are used for security, login/session continuity, and core site functionality. These are needed for the site to operate properly.",
      "Analytics or performance cookies are optional. Where we use them, we rely on user consent and provide a cookie consent notification so visitors can accept or reject optional cookies.",
      "Visitors may also change or withdraw cookie preferences later by clearing stored cookie-consent preferences in the browser and revisiting the site, or by adjusting browser cookie settings directly.",
    ],
    bullets: [
      "essential cookies for secure login sessions and fraud/security protection",
      "preference storage for consent choices and basic site settings",
      "optional analytics and website performance measurement only when consent is provided",
      "cookie preference records retained for up to 6 months unless cleared earlier by the user",
      "users can manage or delete cookies through browser settings at any time",
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
      "Because the platform contains information relating to minors and vulnerable individuals, Bella Bay applies heightened security and access controls.",
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
    {/* Calm page header (matches About/Impact tone; no loud gradients/cards). */}
    <WaveDivider className="text-muted" />
    <section className="bg-muted -mt-1 pt-14 pb-10 md:pt-16 md:pb-12">
      <div className="container mx-auto px-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-xs font-medium tracking-wide text-[hsl(200_18%_30%)]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[hsl(200_18%_34%)]" aria-hidden="true" />
          Privacy & Data Protection
        </div>
        <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight text-[hsl(200_24%_18%)] md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[hsl(200_14%_38%)]">
          Bella Bay ("we," "our," or "us") is committed to protecting the privacy and security of all individuals
          whose information is processed through our platform, including donors, administrators, employees, residents,
          and other authorized users.
        </p>
        <p className="mt-3 text-sm text-[hsl(200_15%_32%)]">Last Updated: April 6, 2026</p>
      </div>
    </section>

    <WaveDivider className="text-muted rotate-180" />

    <section className="bg-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-muted/40 p-6 md:p-8">
            <p className="leading-relaxed text-[hsl(200_14%_38%)]">
            This Privacy Notice explains how we collect, use, store, and protect personal information when you access
            our website, donor dashboard, administrative portal, and case inventory system.
            </p>
            <p className="mt-4 text-[hsl(200_14%_38%)]">
              For privacy-related questions, contact{" "}
              <a className="font-medium text-[hsl(200_24%_26%)] underline-offset-4 hover:underline" href="mailto:privacy@bellaporto.org">
                privacy@bellaporto.org
              </a>
              .
            </p>
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <article key={section.title} className="scroll-mt-28">
                <h2 className="font-heading text-2xl font-semibold text-[hsl(200_24%_18%)]">{section.title}</h2>
                {section.subtitle ? (
                  <h3 className="mt-2 text-xs font-semibold tracking-[0.14em] uppercase text-[hsl(200_15%_32%)]">
                    {section.subtitle}
                  </h3>
                ) : null}

                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 leading-relaxed text-[hsl(200_14%_38%)]">
                    {paragraph}
                  </p>
                ))}

                {section.bullets?.length ? (
                  <ul className="mt-4 grid gap-2 md:grid-cols-2">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm text-[hsl(200_18%_22%)]"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-muted/40 p-6 md:p-8">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(200_18%_34%)]" aria-hidden="true" />
              <div>
                <h3 className="font-heading text-xl font-semibold text-[hsl(200_24%_18%)]">Privacy Requests</h3>
                <p className="mt-2 text-[hsl(200_14%_38%)]">
                  To submit an access, correction, deletion, or consent-withdrawal request, email{" "}
                  <a className="font-medium text-[hsl(200_24%_26%)] underline-offset-4 hover:underline" href="mailto:privacy@bellaporto.org">
                    privacy@bellaporto.org
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </PublicLayout>
);

export default PrivacyPolicy;
