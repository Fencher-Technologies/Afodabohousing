# Terms of Service — v1 (draft for review)

Seed source for `terms_versions` (columns: id, version, title, content,
is_active, effective_from, created_at). Assembled verbatim from
`src/pages/Terms.tsx` SECTIONS as of this commit, which already
incorporates the owner's QA edits (commits `b84bac7`, `93a3761`).

Suggested row: version = '1.0', title = 'Terms of Service',
content = the full text below, is_active = true once approved.
Do NOT seed until approved — terms_consents is empty and must only
reference a reviewed version.

> These Terms of Service govern your access to and use of the Axis platform, operated by ECOSOPAT CO LTD, a company registered in Uganda. Please read these terms carefully before using our services.

## 1. Acceptance of Terms

By accessing or using the Axis platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our services. These terms apply to all users, including tenants, house managers and administrators.

## 2. Account Registration

You must provide accurate, complete and current information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us immediately at info@axishousings.com of any unauthorised use of your account.

You must be at least 18 years old to create an account. By registering, you represent that you meet this age requirement.

## 3. User Responsibilities

Every party using the Axis platform carries responsibility for their own due diligence before entering any contractual obligation.

The guest in search of a house has the responsibility to carry out further due diligence to verify the authenticity of the desired property before entering any contractual obligation.

The house manager has a responsibility to verify the credibility of the intended tenant before entering any contractual obligation.

## 4. Property Listings

House managers warrant that all property information submitted is accurate, truthful and not misleading. Listings must not include false addresses, fabricated amenities or photographs of other properties.

Axis reserves the right to remove any listing that violates these terms, contains misleading information, or is reported as fraudulent by multiple users, without prior notice or refund.

## 5. Quality Assurance and Standards

In the context of the Axis platform, a standard is the minimum requirement in terms of decency and hygiene that a property is supposed to have to be approved and posted on the platform. Before properties are posted on the forum, they are subject to review for approval and verification to ensure that they align with the minimum quality standard.

House managers must adhere to these quality standards and list only properties that are of an acceptable standard and quality. The owners of the Axis platform retain the right to review and take down any property deemed below the required quality standard that may cause defamation of the platform.

## 6. Tenancy Agreements

Digital tenancy agreements created on Axis are binding between the tenant and house manager. Axis acts as a facilitating platform only and is not a party to any tenancy agreement. Disputes between tenants and house managers are to be resolved directly or through the appropriate Ugandan courts.

## 7. Payments

Online rent payments are processed via PesaPal. Payment proof uploads are reviewed by the house manager, not Axis. We do not guarantee the receipt of funds or the accuracy of payment confirmations provided by house managers.

Axis only receives money for the services charged which includes subscriptions and property boosting. Rent paid through the platform belongs to the house manager or property owner. Axis is not liable for payment disputes between tenants and house managers. All rent amounts are in Ugandan Shillings (UGX) unless otherwise stated.

## 8. Subscriptions

Access to premium platform features for house managers is granted through paid subscriptions. All subscription payments are final and non-refundable once made.

## 9. SMS Notifications

By providing a phone number, you consent to receive SMS messages from Axis via EgoSMS. Standard mobile carrier rates may apply. We send operational SMS messages only, including rent reminders, payment confirmations and account notices. We do not send promotional SMS without your explicit consent.

## 10. Prohibited Conduct

You agree not to: use the platform to post fraudulent property listings; impersonate other users or persons; collect personal data of other users without consent; attempt to gain unauthorised access to any part of the platform; use automated scripts to scrape or harvest data; harass, threaten or abuse other users through the messaging system; or use the platform for any unlawful purpose under Ugandan law.

Violation of these rules will result in immediate account suspension and, where applicable, reporting to relevant Ugandan authorities.

## 11. Intellectual Property

The Axis platform, including its software, design, branding, and content is owned by ECOSOPAT CO LTD and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without express written permission.

## 12. Limitation of Liability

Axis provides the platform on an "as is" basis. We make no warranties, express or implied, regarding the accuracy of listings, the conduct of house managers or tenants, or the security of any specific property.

Axis provides its platform as a management tool. To the maximum extent permitted by law, we are not liable for disputes between property managers and tenants, financial losses resulting from use of the platform or indirect, incidental or unintended consequential damages arising from your use of our services, including property damage, personal injury, or financial loss resulting from rental fraud. Subscription once made is non refundable.

## 13. Governing Law

These Terms of Service are governed by and construed in accordance with the laws of the Republic of Uganda and applicable international laws. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Uganda.

## 14. Alternative Dispute Resolution

In the event of any dispute arising from these terms or your use of the platform, the parties shall first attempt to resolve the matter amicably through good-faith negotiation.

Where negotiation fails, the dispute shall be referred to alternative dispute resolution (mediation or arbitration) in accordance with the applicable laws of the Republic of Uganda before either party resorts to court litigation.

## 15. Changes to Terms

We reserve the right to modify these Terms of Service at any time. Changes will be effective upon posting to the platform. Continued use after changes constitutes acceptance. We will notify registered users of material changes via email.

## 16. Contact

For questions about these Terms of Service, contact us at info@axishousings.com or write to ECOSOPAT CO LTD, Kampala, Uganda.

---

### Reviewer notes (do not seed)

- Section 6 still names Ugandan courts. The owner separately reported a
  tenancy agreement citing Kenya — jurisdiction beyond the added
  international-laws wording was deliberately NOT changed; confirm with
  him before editing.
- Section numbering shifted when Quality Assurance (§5) and
  Subscriptions (§8) were inserted; the owner's section numbers (§10 IP,
  §11 liability, §12 governing) map to file §11/§12/§13 here.
- "Last updated: March 2026" subtitle in Terms.tsx should be bumped to
  the seed date when this version goes live.
