import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_HOST)

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null

export async function sendCredentialOfferEmail(params: {
  toEmail: string
  toName: string
  credentialType: string
  offerUrl: string
}) {
  const { toEmail, toName, credentialType, offerUrl } = params

  const qrDataUrl = await QRCode.toDataURL(offerUrl, { width: 300, margin: 2 })
  const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '')

  const credentialLabels: Record<string, string> = {
    NationalID: 'National ID',
    mDL: 'Mobile Driving Licence',
    AddressCredential: 'Address Credential',
    ProofOfAge: 'Proof of Age',
    HealthInsuranceCard: 'Health Insurance Card',
    StudentID: 'Student ID',
    VehicleRegistration: 'Vehicle Registration',
    ProfessionalLicense: 'Professional Licence',
    PassportCredential: 'Passport',
    SocialSecurityCredential: 'Social Security Credential',
    BankAccountCredential: 'Bank Account Credential',
    EmploymentCredential: 'Employment Credential',
    VaccinationCredential: 'Vaccination Certificate',
    DisabilityCredential: 'Disability Credential',
  }
  const label = credentialLabels[credentialType] ?? credentialType

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#1a56db;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">EUDI Wallet</h1>
      <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px;">Digital Identity Credential</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#111827;">Hello <strong>${toName}</strong>,</p>
      <p style="color:#374151;line-height:1.6;">
        Your <strong>${label}</strong> credential has been approved and is ready to add to your EUDI Wallet.
      </p>
      <p style="color:#374151;line-height:1.6;">
        Open the <strong>EUDI Wallet</strong> app on your phone, tap the <strong>QR code icon</strong>,
        and scan the QR code below:
      </p>
      <div style="text-align:center;padding:24px 0;">
        <img src="cid:qrcode" alt="Credential QR Code"
             style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:8px;" />
      </div>
      <p style="font-size:12px;color:#9ca3af;text-align:center;">
        This QR code expires in 30 minutes. If it expires, please contact the issuer.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="font-size:12px;color:#9ca3af;">
        EUDI Digital Identity Wallet Demo System
      </p>
    </div>
  </div>
</body>
</html>`

  if (!transporter) {
    console.warn('[email] SMTP not configured — skipping email to', toEmail)
    return
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'EUDI Issuer <noreply@eudi.demo>',
    to: toEmail,
    subject: `Your ${label} credential is ready`,
    html,
    attachments: [{
      filename: 'credential-qr.png',
      content: qrBase64,
      encoding: 'base64',
      cid: 'qrcode',
    }],
  })
}
