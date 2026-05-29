import { Link } from 'react-router-dom';

export function EndUserTerms() {
  return (
    <div className="container-sm page legal-doc">
      <div className="page-title">
        <h1>End User Terms &amp; Conditions</h1>
        <p>Terms governing the use of Esena Africa closed-loop credit facilities.</p>
        <p className="legal-meta">
          Document Reference: ESA/LEGAL/UTC/2026/001 · Version 1.0 · Effective 1 January 2026 ·
          Governing Law: Federal Republic of Nigeria
        </p>
      </div>

      <div className="card legal-body">
        <p className="legal-callout">
          Please read these Terms and Conditions ("User Terms") carefully before ticking the acceptance
          box on the Esena Africa application or portal.
        </p>
        <p>
          These User Terms constitute a legally binding agreement between you, the individual user
          ("you", "End User", or "Borrower"), and Esena Africa Limited ("Esena Africa", "we", "us", or
          "our") in respect of your use of the Esena Africa closed-loop consumer credit facility. By
          accepting these Terms, you acknowledge that you have had the opportunity to read and
          understand them. If you do not agree, do not proceed.
        </p>
        <p>
          Esena Africa is not a deposit-taking institution and does not hold deposits. The credit
          facility offered is a regulated consumer credit product issued under the Money Lending Laws of
          Lagos State and the Federal Competition and Consumer Protection Commission (FCCPC) Digital
          Lending Guidelines, 2022.
        </p>

        <h2>1. About Esena Africa and the Product</h2>
        <p>
          1.1 Esena Africa Limited is a technology-enabled consumer credit company incorporated in
          Nigeria, holding a Money Lender Licence from the Lagos State Ministry of Home Affairs and
          registered as a digital lender with the FCCPC.
        </p>
        <p>1.2 The Esena Credit Facility is a closed-loop, short-term consumer credit product. This means:</p>
        <ul>
          <li>
            Credit is not disbursed in cash to you. Esena Africa pays your approved merchant partner
            directly on your behalf at the point of purchase.
          </li>
          <li>
            You may only use the Esena Credit Facility at approved Esena Partner locations for the
            purchase of eligible goods (groceries, essential household items, and pharmaceutical
            products).
          </li>
          <li>
            You are obligated to repay the full amount credited on your behalf plus applicable fees to
            Esena Africa within the repayment period stated in your Credit Agreement.
          </li>
        </ul>
        <p>
          1.3 By accepting these Terms, you enter into a credit relationship with Esena Africa. You are
          the Borrower and Esena Africa is the Lender.
        </p>

        <h2>2. Eligibility</h2>
        <p>To be eligible for an Esena Credit Facility, you must at all times:</p>
        <ul>
          <li>Be a Nigerian citizen or legally resident in Nigeria;</li>
          <li>Be at least eighteen (18) years of age;</li>
          <li>Possess a valid Bank Verification Number (BVN) and National Identity Number (NIN);</li>
          <li>Have an active personal Nigerian bank account in your own name;</li>
          <li>
            Not be a current bankrupt, under debt counselling, or subject to any court order prohibiting
            you from obtaining credit;
          </li>
          <li>Not be an employee or close associate of Esena Africa (subject to separate staff lending policy);</li>
          <li>Provide true, accurate, and complete information during registration and KYC;</li>
          <li>Consent to the processing of your Personal Data as described in Clause 9 and in our Privacy Policy.</li>
        </ul>

        <h2>3. Know Your Customer (KYC) and Identity Verification</h2>
        <p>
          3.1 Esena Africa is required by law to verify your identity before making any credit available
          to you. As part of onboarding, you will be required to provide:
        </p>
        <ul>
          <li>Full legal name (as on NIN/BVN);</li>
          <li>Date of birth;</li>
          <li>Residential address;</li>
          <li>NIN (National Identity Number);</li>
          <li>BVN (Bank Verification Number);</li>
          <li>Selfie photograph for biometric liveness verification;</li>
          <li>Valid government-issued ID (Voter's Card, Driver's Licence, International Passport, or NIN Slip);</li>
          <li>Bank account details (account number and bank);</li>
          <li>
            Consent to bank statement retrieval via Open Banking API (Mono, Okra, or equivalent
            CBN-licenced Open Banking provider).
          </li>
        </ul>
        <p>
          3.2 You warrant that all information provided during KYC is truthful, current, and belongs to
          you. Providing false or fraudulent identity information is a criminal offence under the
          Cybercrimes (Prohibition, Prevention, etc.) Act, 2015 and the Criminal Code Act, and Esena
          Africa will refer such cases to law enforcement.
        </p>
        <p>
          3.3 Esena Africa will verify your BVN and NIN with the Nigeria Inter-Bank Settlement System
          (NIBSS) and the National Identity Management Commission (NIMC) respectively. By providing these
          details, you consent to this verification.
        </p>
        <p>
          3.4 Esena Africa may periodically request updated KYC documentation to satisfy its ongoing
          AML/CFT obligations. Failure to provide updated documentation may result in suspension of your
          credit facility.
        </p>

        <h2>4. Credit Assessment and Facility Terms</h2>
        <p>
          4.1 Esena Africa uses a proprietary machine-learning credit scoring engine to assess your
          creditworthiness. Factors considered include but are not limited to: bank statement analysis,
          BVN/NIN bureau data, repayment history with Esena Africa, and behavioural indicators from the
          Platform.
        </p>
        <p>
          4.2 You are not entitled to a credit facility by virtue of meeting the eligibility criteria.
          Esena Africa retains absolute discretion to approve or decline any credit application.
        </p>
        <p>4.3 Upon approval, your Credit Agreement will set out:</p>
        <ul>
          <li>Your approved credit limit (initial range: ₦20,000 – ₦100,000 depending on your tier);</li>
          <li>The applicable monthly fee rate (currently 5% of outstanding balance for Starter tier);</li>
          <li>The repayment due date (30 days from the date of each Credit Transaction for initial cycle);</li>
          <li>Your credit tier (Starter, Builder, Prime, or Preferred).</li>
        </ul>
        <p>
          4.4 Tier Progression: Your credit limit and applicable fee rate may improve over time based on
          consistent on-time repayment behaviour. Tier criteria are published in the Esena App. Esena
          Africa reserves the right to revise tier criteria at any time with thirty (30) days' notice.
        </p>
        <p>
          4.5 Zero-Interest Preferred Tier: Qualifying End Users with 12+ months of on-time repayments
          and a credit score of 800 or above may be nominated for the Preferred tier, under which Esena
          Africa's fee is sponsored by the retailer. This is not a right and is subject to available
          retailer sponsorship.
        </p>

        <h2>5. Use of the Credit Facility</h2>
        <p>
          5.1 You may only use your Esena Credit Facility at approved Esena Partner locations and only
          for the purchase of eligible goods as displayed in the Esena App.
        </p>
        <p>5.2 You must not:</p>
        <ul>
          <li>Request or collude with any merchant to receive cash in exchange for a Credit Transaction (cash-out fraud);</li>
          <li>Use the Esena Credit Facility to purchase alcohol, tobacco, gambling products, or any ineligible items;</li>
          <li>Share your Esena App login credentials or virtual credit token with any other person;</li>
          <li>Attempt to manipulate, circumvent, or exploit the credit scoring algorithm;</li>
          <li>Submit false bank statements, identity documents, or income information;</li>
          <li>Allow a third party to use your Esena account to transact on their behalf.</li>
        </ul>
        <p>
          5.3 Violation of Clause 5.2 shall result in immediate suspension of your account, forfeiture of
          any pending credits, and may result in criminal prosecution.
        </p>

        <h2>6. Fees, Charges and Total Cost of Credit</h2>
        <p>
          Esena Africa is required by the FCCPC Digital Lending Guidelines, 2022 to make full disclosure
          of all fees and the total cost of credit prior to your acceptance. The following fee schedule
          applies as at the effective date of these Terms:
        </p>
        <table className="simple">
          <thead>
            <tr>
              <th>Fee type</th>
              <th>Rate</th>
              <th>Example (₦50,000 loan)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Monthly Management Fee (Starter)</td><td>5.0% of outstanding balance</td><td>₦2,500 per cycle</td></tr>
            <tr><td>Monthly Management Fee (Builder)</td><td>4.5% of outstanding balance</td><td>₦2,250 per cycle</td></tr>
            <tr><td>Monthly Management Fee (Prime)</td><td>4.0% of outstanding balance</td><td>₦2,000 per cycle</td></tr>
            <tr><td>Origination / Processing Fee</td><td>2.0% of disbursement (one-off)</td><td>₦1,000 per new facility</td></tr>
            <tr><td>Late Payment Penalty</td><td>5% of outstanding balance on day 31+</td><td>₦2,500 if paid on day 31</td></tr>
            <tr><td>Rollover Fee (if approved)</td><td>2.5% of outstanding for each 15-day rollover</td><td>₦1,250 per rollover</td></tr>
            <tr><td>Stamp Duty (where applicable)</td><td>As prescribed by Stamp Duties Act</td><td>As applicable</td></tr>
          </tbody>
        </table>
        <p>
          Effective Annual Rate (EAR) Illustration: A Starter-tier borrower taking ₦50,000 for 12
          consecutive monthly cycles pays approximately ₦30,000 in management fees annually, representing
          an effective annual cost of approximately 60% p.a. This compares favourably to informal lenders
          (daily collectors) who typically charge effective rates in excess of 200% p.a.
        </p>
        <p>
          Esena Africa reserves the right to revise fees. Any revision will be notified to you via the
          Esena App and via your registered email at least thirty (30) days before taking effect. Your
          continued use after the notice period constitutes acceptance.
        </p>

        <h2>7. Repayment Obligations</h2>
        <p>
          7.1 You are obligated to repay the total outstanding balance (principal + management fee + any
          other applicable charges) on or before the repayment due date stated in your Credit Agreement.
        </p>
        <p>7.2 Repayment may be made via:</p>
        <ul>
          <li>Direct debit from your registered bank account (primary method);</li>
          <li>Bank transfer to Esena Africa's designated repayment account;</li>
          <li>USSD payment via *737# or other approved USSD channel;</li>
          <li>Payment via the Esena App.</li>
        </ul>
        <p>
          7.3 By accepting these Terms, you irrevocably authorise Esena Africa to initiate a direct debit
          from your registered bank account for the repayment amount due on the repayment date, using your
          BVN-linked account details. This mandate shall remain active for as long as you have an
          outstanding balance with Esena Africa.
        </p>
        <p>
          7.4 Where a direct debit is returned unpaid due to insufficient funds, you shall be liable for
          the outstanding balance plus the Late Payment Penalty, and Esena Africa may make further debit
          attempts.
        </p>
        <p>
          7.5 Esena Africa will send payment reminders via SMS, push notification, and email three (3)
          days and one (1) day before your repayment due date.
        </p>
        <p>7.6 Early repayment is permitted at any time without penalty.</p>
        <p>
          7.7 Esena Africa does NOT authorise any third-party agent, individual, or company to collect
          repayments on its behalf in cash. All repayments must be made through the official channels
          listed in Clause 7.2. Report any individual claiming to collect cash repayments on behalf of
          Esena Africa to support@esena.africa immediately.
        </p>

        <h2>8. Default and Collections</h2>
        <p>8.1 You are considered in default if payment is not received within thirty (30) days of the repayment due date.</p>
        <p>8.2 Upon default, Esena Africa may:</p>
        <ul>
          <li>Immediately suspend your credit facility pending full repayment;</li>
          <li>Report your default to all licenced credit bureaus in Nigeria (including CRC Credit Bureau and First Central Credit Bureau) in accordance with CBN Credit Reporting Guidelines;</li>
          <li>Engage its licensed debt recovery team or external debt collection agency, who shall only contact you through lawful and dignified means in accordance with FCCPC guidelines;</li>
          <li>Initiate legal proceedings to recover the outstanding debt.</li>
        </ul>
        <p>8.3 Esena Africa will NEVER:</p>
        <ul>
          <li>Disclose your debt status to your employer, family members, or contacts without your prior consent or a court order;</li>
          <li>Use threatening, abusive, or harassing language in any communication with you;</li>
          <li>Access your phone contacts, gallery, or social media without your explicit consent (and Esena Africa's App does NOT request such permissions).</li>
        </ul>
        <p>
          8.4 If you are experiencing financial difficulty, you are strongly encouraged to contact Esena
          Africa proactively at support@esena.africa before the due date to discuss restructuring options.
        </p>

        <h2>9. Data Protection, Privacy and Consent</h2>
        <p>
          9.1 Esena Africa processes your Personal Data as a Data Controller under the Nigeria Data
          Protection Act, 2023. Full details are set out in our Privacy Policy at
          www.esena.africa/privacy, which forms an integral part of these Terms.
        </p>
        <p>9.2 By accepting these Terms, you consent to Esena Africa processing your Personal Data for: identity verification (KYC) via NIBSS and NIMC; credit assessment via Open Banking API; transaction processing and repayment management; credit bureau reporting; fraud detection and AML/CFT screening; regulatory compliance; customer service; and anonymised analytics.</p>
        <p>
          9.3 Open Banking Consent: You specifically consent to Esena Africa retrieving your bank account
          transaction history (up to 12 months) via a CBN-licenced Open Banking provider for credit
          assessment. This retrieval is read-only.
        </p>
        <p>9.4 Esena Africa does NOT sell your Personal Data to third parties for marketing purposes.</p>
        <p>
          9.5 Your Rights: Under the NDPA you have the right to access, correct, object to processing,
          data portability, and erasure (subject to legal retention). To exercise these rights, contact
          dpo@esena.africa.
        </p>
        <p>
          9.6 Data Retention: Esena Africa will retain your Personal Data for the duration of your account
          and for a minimum of seven (7) years after account closure, in compliance with CAMA 2020, the
          Finance Act, and CBN record-keeping requirements.
        </p>

        <h2>10. Confidentiality of Account</h2>
        <p>
          10.1 Your Esena account, credit limit, repayment history, and credit score are strictly
          confidential and will not be disclosed to any third party except as required by law.
        </p>
        <p>
          10.2 You shall keep your Esena App login credentials (PIN, password, biometrics) strictly
          confidential. Esena Africa shall not be liable for unauthorised transactions resulting from your
          negligent disclosure of credentials.
        </p>

        <h2>11. Complaints and Dispute Resolution</h2>
        <p>11.1 If you have a complaint, contact us via in-App support chat, email (support@esena.africa), the published support line, or written complaint to Esena Africa Legal &amp; Compliance, Ikeja, Lagos.</p>
        <p>11.2 Esena Africa will acknowledge your complaint within one (1) business day and provide a substantive response within fourteen (14) days.</p>
        <p>
          11.3 If unsatisfied, you may escalate to the FCCPC (www.fccpc.gov.ng) or the Consumer Protection
          Department of the Central Bank of Nigeria (www.cbn.gov.ng).
        </p>
        <p>11.4 Any unresolved dispute shall be subject to binding arbitration in Lagos under the Arbitration and Conciliation Act, 2023.</p>

        <h2>12. Prohibited Jurisdictions and Use</h2>
        <p>
          The Esena Credit Facility is currently available only to persons resident in Nigeria. You must
          not use the Platform in any manner that violates applicable Nigerian law.
        </p>

        <h2>13. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by Nigerian law, Esena Africa's liability is limited to direct
          losses caused by its own negligence or wilful default. Esena Africa is not liable for
          consequential losses, losses from your non-compliance, downtime beyond its control, or
          third-party payment/banking failures.
        </p>

        <h2>14. Anti-Money Laundering Obligations</h2>
        <p>
          Esena Africa is required by the Money Laundering (Prevention and Prohibition) Act, 2022 and CBN
          AML/CFT Regulations to verify your identity, monitor transactions, report suspicious activity to
          the NFIU, and decline transactions that may constitute money laundering or terrorism financing.
          You confirm that funds used to repay are from legitimate sources.
        </p>

        <h2>15. Amendments to these Terms</h2>
        <p>
          Esena Africa may update these Terms at any time. You will be notified of material changes via
          in-App notification and registered email at least thirty (30) days before changes take effect.
          Continued use after the effective date constitutes acceptance.
        </p>

        <h2>16. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria. You irrevocably submit
          to the jurisdiction of the courts of Lagos State for matters not subject to arbitration under
          Clause 11.4.
        </p>

        <h2>17. Key Contacts</h2>
        <table className="simple">
          <tbody>
            <tr><td>Customer Support</td><td>support@esena.africa · In-App Chat</td></tr>
            <tr><td>Data Protection Officer</td><td>dpo@esena.africa</td></tr>
            <tr><td>Website</td><td>www.esena.africa</td></tr>
            <tr><td>FCCPC (External Escalation)</td><td>www.fccpc.gov.ng</td></tr>
            <tr><td>CBN Consumer Protection</td><td>www.cbn.gov.ng/ConsumerProtection</td></tr>
          </tbody>
        </table>

        <p className="legal-callout">
          By checking the "I have read, understood and agree to Esena Africa's Terms and Conditions" box
          on the Esena Africa application or portal, you confirm that you are legally bound by these Terms
          and that you are entering into a credit agreement with Esena Africa Limited.
        </p>
      </div>

      <div className="legal-actions">
        <Link to="/signup" className="btn">Back to sign up</Link>
        <Link to="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  );
}
