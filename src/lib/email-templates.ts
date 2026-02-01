/**
 * Email Templates for K9Desk
 * Centralized email copy for all transactional emails
 */

export const emailTemplates = {
  /**
   * Welcome email sent after user completes onboarding
   */
  welcome: (businessName: string, trialEndsDate: string) => ({
    subject: 'Welcome to K9Desk! 🐾',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to K9Desk! 🐾</h1>
        </div>
        
        <h2 style="color: #667eea;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">Thanks for signing up! Your <strong>14-day free trial</strong> is now active.</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748;">What's Next?</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 10px;">✅ Set up your public booking page</li>
            <li style="margin-bottom: 10px;">✅ Add your first customer</li>
            <li style="margin-bottom: 10px;">✅ Schedule an appointment</li>
            <li style="margin-bottom: 10px;">✅ Customize your services</li>
          </ul>
        </div>
        
        <p style="font-size: 16px;"><strong>Your trial ends on ${trialEndsDate}</strong></p>
        <p style="color: #718096;">✓ No credit card required<br>✓ You will NOT be auto-charged<br>✓ Full access for 14 days</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://k9desk.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Get Started</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Questions? Just reply to this email or visit <a href="https://k9desk.com" style="color: #667eea;">k9desk.com</a></p>
      </body>
      </html>
    `,
  }),

  /**
   * Trial expiration warning (7 days or 3 days before)
   */
  trialExpiring: (businessName: string, daysLeft: number) => ({
    subject: `Your K9Desk trial expires in ${daysLeft} days`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">Your 14-day free trial ends in <strong style="color: #f56565;">${daysLeft} days</strong>.</p>
        
        <div style="background: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #c53030;">Don't lose access to your data!</p>
        </div>
        
        <p style="font-size: 16px;">To keep using K9Desk after your trial:</p>
        <ol style="padding-left: 20px; font-size: 16px;">
          <li style="margin-bottom: 10px;">Go to <strong>Settings → Subscription</strong></li>
          <li style="margin-bottom: 10px;">Choose <strong>Monthly ($29/mo)</strong> or <strong>Yearly ($290/yr - save $58!)</strong></li>
          <li style="margin-bottom: 10px;">Enter payment details</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://k9desk.com/settings" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Subscribe Now</a>
        </div>
        
        <p style="color: #718096;">Your data will remain safe for 30 days after your trial ends, giving you time to reactivate.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Questions? Reply to this email.</p>
      </body>
      </html>
    `,
  }),

  /**
   * Trial has expired
   */
  trialExpired: (businessName: string) => ({
    subject: 'Your K9Desk trial has ended',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">Your 14-day free trial has ended.</p>
        
        <div style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #2c5282;">Your data is safe!</p>
          <p style="margin: 10px 0 0 0;">We'll keep your data for 30 days. Subscribe now to regain access.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://k9desk.com/settings" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Subscribe to K9Desk</a>
        </div>
        
        <p style="font-size: 16px;">Choose your plan:</p>
        <ul style="list-style: none; padding: 0;">
          <li style="background: #f7fafc; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
            <strong>Monthly:</strong> $29/month
          </li>
          <li style="background: #f7fafc; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
            <strong>Yearly:</strong> $290/year <span style="color: #48bb78; font-weight: bold;">(Save $58!)</span>
          </li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Questions? Reply to this email.</p>
      </body>
      </html>
    `,
  }),

  /**
   * Payment receipt
   */
  paymentReceipt: (businessName: string, amount: string, date: string, invoiceUrl: string) => ({
    subject: `Payment Receipt - $${amount}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #48bb78; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Received ✓</h1>
        </div>
        
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">We've received your payment. Thank you!</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #718096;">Amount:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 18px;">$${amount}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #718096; border-top: 1px solid #e2e8f0;">Date:</td>
              <td style="padding: 10px 0; text-align: right; border-top: 1px solid #e2e8f0;">${date}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invoiceUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Download Invoice</a>
        </div>
        
        <p style="color: #718096;">Thank you for using K9Desk!</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Questions about your payment? Reply to this email.</p>
      </body>
      </html>
    `,
  }),

  /**
   * Payment failed - immediate notification (Day 1)
   */
  paymentFailed: (businessName: string) => ({
    subject: 'Payment Update Needed for K9Desk',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">We tried to process your K9Desk subscription payment, but it didn't go through.</p>
        
        <div style="background: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #c53030;">No worries - your account is still active!</p>
          <p style="margin: 10px 0 0 0;">You have <strong>3 days</strong> to update your payment method.</p>
        </div>
        
        <p style="font-size: 16px;">This can happen for a few reasons:</p>
        <ul style="padding-left: 20px; font-size: 16px;">
          <li style="margin-bottom: 10px;">Card expired</li>
          <li style="margin-bottom: 10px;">Insufficient funds</li>
          <li style="margin-bottom: 10px;">Card issuer declined</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://billing.stripe.com/p/login/test_123" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Update Payment Method</a>
        </div>
        
        <p style="color: #718096;">Your data is safe and will remain accessible for 30 days, giving you plenty of time to update your payment information.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Questions? Reply to this email.</p>
      </body>
      </html>
    `,
  }),

  /**
   * Payment failed - Day 2 warning (read-only mode)
   */
  paymentFailedDay2: (businessName: string) => ({
    subject: 'K9Desk Account Now Read-Only - 2 Days to Update Payment',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">Your K9Desk account is now in <strong style="color: #f56565;">read-only mode</strong> due to the payment issue we mentioned yesterday.</p>
        
        <div style="background: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #c53030;">You can still view all your data</p>
          <p style="margin: 10px 0 0 0;">But you won't be able to create or edit appointments, customers, or pets until payment is updated.</p>
        </div>
        
        <p style="font-size: 16px;">You have <strong style="color: #f56565;">2 days remaining</strong> to update your payment method before your account is locked.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://billing.stripe.com/p/login/test_123" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Update Payment Now</a>
        </div>
        
        <p style="color: #718096;">Once your payment is updated, full access will be restored immediately.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Need help? Reply to this email.</p>
      </body>
      </html>
    `,
  }),

  /**
   * Payment failed - Day 3 final warning
   */
  paymentFailedFinal: (businessName: string) => ({
    subject: 'Final Reminder: K9Desk Account Locks Tomorrow',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #c53030; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Final Notice</h1>
        </div>
        
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">Your K9Desk account will be <strong style="color: #c53030;">locked in 24 hours</strong> if payment is not updated.</p>
        
        <div style="background: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #c53030;">Don't lose access to your business!</p>
          <p style="margin: 10px 0 0 0;">Update your payment method now to keep your schedule, client history, and data accessible.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://billing.stripe.com/p/login/test_123" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Update Payment Method</a>
        </div>
        
        <p style="color: #718096;">Your data will remain safe for 30 days after lockout, but you won't be able to access it until payment is resolved.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Questions? Reply to this email - we're here to help.</p>
      </body>
      </html>
    `,
  }),

  /**
   * Account locked due to payment failure
   */
  accountLocked: (businessName: string) => ({
    subject: 'K9Desk Account Locked - Update Payment to Restore Access',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">Your K9Desk account has been locked due to an outstanding payment issue.</p>
        
        <div style="background: #ebf8ff; border-left: 4px solid #3182ce; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #2c5282;">Your data is safe!</p>
          <p style="margin: 10px 0 0 0;">We'll keep your data for 30 days. Update your payment method to regain access immediately.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://billing.stripe.com/p/login/test_123" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Restore Access Now</a>
        </div>
        
        <p style="font-size: 16px;">Once your payment is updated, you'll regain full access to:</p>
        <ul style="padding-left: 20px; font-size: 16px;">
          <li style="margin-bottom: 10px;">Your complete schedule</li>
          <li style="margin-bottom: 10px;">All client and pet records</li>
          <li style="margin-bottom: 10px;">Payment history</li>
          <li style="margin-bottom: 10px;">Business settings</li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Need help? Reply to this email.</p>
      </body>
      </html>
    `,
  }),

  /**
   * Payment restored - account reactivated
   */
  paymentRestored: (businessName: string) => ({
    subject: 'Welcome Back! Your K9Desk Account is Active',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #48bb78; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✓ Payment Successful</h1>
        </div>
        
        <h2 style="color: #2d3748;">Hi ${businessName},</h2>
        <p style="font-size: 16px;">Great news! Your payment has been processed successfully and your K9Desk account is now fully active.</p>
        
        <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #22543d;">Full access restored!</p>
          <p style="margin: 10px 0 0 0;">You can now create and edit appointments, manage clients, and access all features.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://k9desk.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
        </div>
        
        <p style="color: #718096;">Thank you for being a valued K9Desk customer!</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #718096; font-size: 14px;">Questions? Reply to this email.</p>
      </body>
      </html>
    `,
  }),
};
