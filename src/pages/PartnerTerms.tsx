import { Link } from 'react-router-dom';

export function PartnerTerms() {
  return (
    <div className="container-sm page legal-doc">
      <div className="page-title">
        <h1>Partner Portal Terms &amp; Conditions</h1>
        <p>Binding terms for grocery and pharmaceutical merchant partners.</p>
        <p className="legal-meta">
          Document Reference: ESA/LEGAL/PTC/2026/001 · Version 1.0 · Effective 1 January 2026 ·
          Governing Law: Federal Republic of Nigeria
        </p>
      </div>

      <div className="card legal-body">
        <p className="legal-callout">
          Please read these Terms and Conditions carefully before checking the acceptance box on the
          Esena Africa Partner Portal.
        </p>
        <p>
          By checking the "I accept" box during your registration on the Esena Africa Partner Portal, you
          ("the Partner") agree to be legally bound by these Partner Terms and Conditions ("Partner T&amp;C"
          or "these Terms") as a standalone agreement and, where a full Partnership Agreement
          (ESA/LEGAL/PA/2026/001) has been executed, as supplementary terms incorporated therein by
          reference. These Terms take effect from the date of acceptance. If you do not agree with any
          part of these Terms, you must not proceed with registration.
        </p>

        <h2>1. About Esena Africa</h2>
        <p>
          Esena Africa Limited is a technology-enabled financial services company incorporated in Nigeria
          under the Companies and Allied Matters Act, 2020 (CAMA). Esena Africa operates a closed-loop
          digital credit platform that enables verified End Users to purchase essential groceries and
          pharmaceutical products at authorised Partner locations, with settlements processed directly
          between Esena Africa and the Partner without cash disbursement to the End User.
        </p>
        <p>
          Esena Africa holds a Money Lender Licence issued by the Lagos State Ministry of Home Affairs, is
          registered as a digital lender with the FCCPC, and is compliant with the Nigeria Data Protection
          Act, 2023.
        </p>

        <h2>2. Eligibility and Registration</h2>
        <p>2.1 To register as a Partner on the Esena Africa Platform, you must be:</p>
        <ul>
          <li>A legally registered business entity under Nigerian law (private limited company, enterprise, or registered business name);</li>
          <li>Actively trading in grocery retail, pharmaceutical retail, or essential goods supply;</li>
          <li>In possession of all applicable regulatory licences for your category (including PCN licence for pharmacies, NAFDAC registration for applicable products, SCUML registration where required);</li>
          <li>Not listed on any domestic or international sanctions list, and not under investigation by any regulatory or law enforcement authority;</li>
          <li>Able to integrate your POS terminal or digital wallet with the Esena Platform.</li>
        </ul>
        <p>2.2 You must be at least 18 years of age and duly authorised to bind the business entity on whose behalf you are registering.</p>
        <p>
          2.3 Esena Africa reserves the right to reject any application without providing reasons.
          Provisional access may be granted pending completion of AML/KYC verification, and may be revoked
          if verification is not satisfactorily completed within fifteen (15) business days.
        </p>

        <h2>3. Partner Account and Portal Access</h2>
        <p>3.1 Upon successful registration and verification, you will be issued login credentials to the Esena Partner Dashboard. You are solely responsible for maintaining the confidentiality of your credentials.</p>
        <p>3.2 You must notify Esena Africa immediately at partners@esena.africa if you suspect any unauthorised access to your Partner account.</p>
        <p>3.3 You shall ensure access to the Partner Dashboard is restricted to authorised employees of your business. You are liable for all activities conducted through your Portal account.</p>
        <p>3.4 Esena Africa may implement two-factor authentication (2FA) and other security measures, and you agree to comply with such requirements.</p>

        <h2>4. Accepted Transactions and Prohibited Conduct</h2>
        <p>4.1 You agree to accept all valid Esena closed-loop credit transactions from KYC-verified End Users presenting at your approved location(s). You shall not discriminate against End Users on the basis of the credit instrument used.</p>
        <p>4.2 You shall only accept Esena credit for the purchase of eligible goods. You must not, under any circumstances:</p>
        <ul>
          <li>Accept Esena credit in exchange for cash or cash equivalents (cash-out transactions);</li>
          <li>Accept Esena credit for the purchase of alcohol, tobacco, gambling products, luxury items, or other ineligible goods;</li>
          <li>Split, manipulate, or artificially inflate transaction values;</li>
          <li>Engage in collusive fraud with End Users to obtain settlements for fictitious or inflated transactions;</li>
          <li>Share or re-use Esena-provided End User identification or credit credentials for any purpose other than transaction verification.</li>
        </ul>
        <p>4.3 Any Partner found engaging in the prohibited conduct shall face immediate suspension, permanent deactivation, forfeiture of pending settlements, and referral to law enforcement authorities including the EFCC.</p>

        <h2>5. Fees and Payment Terms</h2>
        <p>5.1 Transaction Fee: Esena Africa shall deduct a Transaction Fee of 1.5% from each Credit Transaction settlement prior to remitting the net amount to your settlement account.</p>
        <p>5.2 VAT: The Transaction Fee is subject to VAT at the applicable statutory rate, which shall be borne by you.</p>
        <p>5.3 Settlement: Net settlement amounts (gross transaction value less Transaction Fee and VAT) shall be remitted to your registered settlement account within T+1 business day.</p>
        <p>5.4 Sponsorship Fee: If you elect to participate in the Zero-Interest Window programme, a monthly Sponsorship Fee of ₦200,000 per enrolled location shall be debited from your settlement account on the first business day of each month. This fee is non-refundable.</p>
        <p>5.5 Esena Africa may revise its fee structure by providing thirty (30) days' written notice. Continued use after the notice period constitutes acceptance.</p>

        <h2>6. Data Protection</h2>
        <p>6.1 By registering, you acknowledge that Esena Africa collects, stores, and processes Personal Data relating to your business, its principals, and employees for AML/KYC verification, contract management, transaction processing and settlement, regulatory compliance, and fraud prevention.</p>
        <p>6.2 Your data shall be processed in accordance with the Nigeria Data Protection Act, 2023 and Esena Africa's Privacy Policy (www.esena.africa/privacy).</p>
        <p>6.3 You consent to Esena Africa sharing your business registration details, transaction data, and AML/CFT-related information with Regulatory Authorities as required by Nigerian law.</p>
        <p>6.4 You shall not process, store, or use any End User Personal Data received via the Esena Platform for any purpose other than completing the specific Credit Transaction for which it was disclosed. Building marketing databases or secondary datasets using Esena-provided End User data is prohibited.</p>
        <p>6.5 You have the right to access, correct, or request deletion of your business's Personal Data held by Esena Africa, subject to retention obligations. Submit requests to dpo@esena.africa.</p>

        <h2>7. AML, KYC and Regulatory Compliance</h2>
        <p>7.1 You confirm that your business, its directors, and beneficial owners are not listed on any sanctions list and have not been convicted of any financial crime.</p>
        <p>7.2 You agree to cooperate with Esena Africa's periodic AML/CFT re-screening and enhanced due diligence processes.</p>
        <p>7.3 You shall maintain your own internal AML/CFT compliance framework appropriate to your business size and risk profile, in accordance with the Money Laundering (Prevention and Prohibition) Act, 2022.</p>
        <p>7.4 You agree to promptly report any suspicious End User transaction or behaviour that may indicate money laundering, fraud, or terrorism financing.</p>

        <h2>8. Suspension and Termination</h2>
        <p>8.1 Esena Africa may suspend your Portal access immediately and without prior notice for: breach of these Terms; suspected or confirmed fraud or financial crime; failure to pass AML/KYC re-verification; insolvency or revocation of a required licence; or regulatory directive.</p>
        <p>8.2 You may deactivate your Partner account at any time by giving thirty (30) days' written notice to partners@esena.africa. Outstanding settlements will be reconciled and paid within fifteen (15) business days of the effective deactivation date.</p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by Nigerian law, Esena Africa shall not be liable for indirect,
          special, or consequential losses; losses from your non-compliance; third-party payment failures;
          or Force Majeure. Esena Africa's total aggregate liability to any Partner shall not exceed the
          net settlement amount paid to that Partner in the three (3) months preceding the claim.
        </p>

        <h2>10. Intellectual Property</h2>
        <p>
          All rights in the Esena Africa brand, Platform technology, APIs, algorithms, and data analytics
          tools are the exclusive property of Esena Africa. These Terms grant you a limited,
          non-transferable, non-exclusive right to display Esena co-branding at your approved location and
          to access the Partner Dashboard for the purposes described in these Terms only.
        </p>

        <h2>11. Amendments</h2>
        <p>
          Esena Africa may update these Terms at any time. Partners will be notified of material changes
          via the Partner Dashboard and/or registered email at least thirty (30) days before changes take
          effect. Continued use after the effective date constitutes acceptance.
        </p>

        <h2>12. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute shall be
          resolved first by negotiation, then mediation, and finally by binding arbitration seated in
          Lagos under the Arbitration and Conciliation Act, 2023.
        </p>

        <h2>13. Contact and Complaints</h2>
        <table className="simple">
          <tbody>
            <tr><td>Compliance enquiries</td><td>compliance@esena.africa</td></tr>
            <tr><td>Data protection matters</td><td>dpo@esena.africa</td></tr>
            <tr><td>Partner support</td><td>partners@esena.africa</td></tr>
          </tbody>
        </table>

        <p className="legal-callout">
          By checking the "I accept these Terms and Conditions" box on the Esena Africa Partner Portal,
          you confirm that you have read, understood, and agree to be legally bound by these Terms on
          behalf of the registered business entity named in your portal account.
        </p>
      </div>

      <div className="legal-actions">
        <Link to="/partner" className="btn">Back to partner application</Link>
        <Link to="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  );
}
