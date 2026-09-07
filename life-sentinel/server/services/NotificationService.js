// NotificationService — abstraction layer for trusted-contact notifications
// Returns honest delivery status. Never fakes success.
//
// Status values:
//   SENT            — provider confirmed delivery
//   NOT_CONFIGURED  — no real provider is configured for this channel
//   FAILED          — provider returned an error
//
// When NOT_CONFIGURED, the backend returns sms_link data so the frontend
// can fall back to device-native SMS compose links.

class NotificationService {
  constructor() {
    // Twilio SMS
    this.twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.twilioFrom = process.env.TWILIO_PHONE_NUMBER || '';
    this.twilioConfigured = !!(this.twilioSid && this.twilioToken && this.twilioFrom);

    // WhatsApp (Graph API)
    this.whatsappToken = process.env.WHATSAPP_API_TOKEN || '';
    this.whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.whatsappConfigured = !!(this.whatsappToken && this.whatsappPhoneId);
  }

  /** Which channels are available */
  getConfiguredProviders() {
    const providers = [];
    if (this.twilioConfigured) providers.push('sms');
    if (this.whatsappConfigured) providers.push('whatsapp');
    return providers;
  }

  /**
   * Send an SMS via the Twilio REST API (no SDK required — uses fetch).
   * SENT is returned only after Twilio accepts the message (HTTP 201).
   * "Accepted" means submitted to the provider, not handset delivery.
   * @returns {{ status: string, method: string, messageId?: string, error?: string }}
   */
  async sendSMS({ to, message }) {
    if (!this.twilioConfigured) {
      // Not configured — generate an SMS deep link as fallback
      const smsLink = `sms:${to}?body=${encodeURIComponent(message)}`;
      return {
        status: 'NOT_CONFIGURED',
        method: 'sms_link',
        smsLink,
        message: 'SMS provider (Twilio) is not configured. Use the smsLink to send manually.',
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
      const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
      const body = new URLSearchParams({
        To: to,
        From: this.twilioFrom,
        Body: message,
      });

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        // 4xx/5xx from Twilio = provider rejected the submission
        return {
          status: 'FAILED',
          method: 'sms',
          error: `Twilio API ${resp.status}: ${errText.slice(0, 200)}`,
        };
      }

      const data = await resp.json();
      // HTTP 201 = Twilio accepted and queued the message (submission confirmed)
      return {
        status: 'SENT',
        method: 'sms',
        messageId: data.sid,
      };
    } catch (err) {
      console.error('Twilio SMS send failed:', err.message);
      return {
        status: 'FAILED',
        method: 'sms',
        error: err.message,
      };
    }
  }

  /**
   * Send a WhatsApp message (if configured).
   * @returns {{ status: string, method: string, messageId?: string, error?: string }}
   */
  async sendWhatsApp({ to, message }) {
    if (!this.whatsappConfigured) {
      return {
        status: 'NOT_CONFIGURED',
        method: 'whatsapp',
        message: 'WhatsApp provider is not configured.',
      };
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${this.whatsappPhoneId}/messages`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`WhatsApp API ${resp.status}: ${errBody}`);
      }

      const data = await resp.json();
      return {
        status: 'SENT',
        method: 'whatsapp',
        messageId: data.messages?.[0]?.id || null,
      };
    } catch (err) {
      console.error('WhatsApp send failed:', err.message);
      return {
        status: 'FAILED',
        method: 'whatsapp',
        error: err.message,
      };
    }
  }

  /**
   * Send notification using the best available channel.
   * Tries SMS first, then WhatsApp. Returns the result.
   * On FAILED, an smsLink is attached so the user can still send manually.
   * @returns {{ status: string, method: string, smsLink?: string }}
   */
  async send({ to, message, preferChannel }) {
    if (preferChannel === 'whatsapp' && this.whatsappConfigured) {
      return this.sendWhatsApp({ to, message });
    }
    if (preferChannel === 'sms' && this.twilioConfigured) {
      return this.sendSMS({ to, message });
    }

    // Default: try SMS first, fall back to WhatsApp
    if (this.twilioConfigured) {
      const result = await this.sendSMS({ to, message });
      if (result.status === 'SENT') return result;
      // If SMS failed, try WhatsApp
      if (this.whatsappConfigured) {
        const waResult = await this.sendWhatsApp({ to, message });
        if (waResult.status === 'SENT') return waResult;
      }
      // Attach manual fallback link to the failure so the user can still send
      return {
        ...result,
        smsLink: `sms:${to}?body=${encodeURIComponent(message)}`,
      };
    }

    if (this.whatsappConfigured) {
      const result = await this.sendWhatsApp({ to, message });
      if (result.status === 'SENT') return result;
      return {
        ...result,
        smsLink: `sms:${to}?body=${encodeURIComponent(message)}`,
      };
    }

    // Nothing configured — return SMS deep link
    const smsLink = `sms:${to}?body=${encodeURIComponent(message)}`;
    return {
      status: 'NOT_CONFIGURED',
      method: 'sms_link',
      smsLink,
      message: 'No notification provider is configured.',
    };
  }
}

// Singleton
const notificationService = new NotificationService();
module.exports = notificationService;
