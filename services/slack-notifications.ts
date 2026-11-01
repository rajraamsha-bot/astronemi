/**
 * Slack Notification Service
 * 
 * Sends alerts to Slack for critical events:
 * - Error rate thresholds
 * - Payment failures
 * - System health issues
 */

import { Logger } from '@/services/logger';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

interface SlackMessage {
  text: string;
  blocks?: Record<string, unknown>[];
  attachments?: Record<string, unknown>[];
}

/**
 * Send a message to Slack
 */
export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    Logger.warn('Slack webhook URL not configured');
    return false;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      Logger.error('Failed to send Slack message', { status: response.status });
      return false;
    }

    Logger.info('Slack message sent successfully');
    return true;
  } catch (error) {
    Logger.error('Error sending Slack message', error);
    return false;
  }
}

/**
 * Send error alert to Slack
 */
export async function sendErrorAlert(
  error: Error,
  context?: {
    userId?: string;
    screen?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }
): Promise<void> {
  const severityEmoji = {
    low: '⚠️',
    medium: '🔶',
    high: '🔴',
    critical: '🚨',
  };

  const severity = context?.severity || 'medium';
  const emoji = severityEmoji[severity];

  const message: SlackMessage = {
    text: `${emoji} Error Alert - AstroNemi`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Error Alert - ${severity.toUpperCase()}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Error:*\n\`${error.message}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severity.toUpperCase()}`,
          },
        ],
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*User ID:*\n${context?.userId || 'N/A'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Screen:*\n${context?.screen || 'N/A'}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Stack:*\n\`\`\`${error.stack?.slice(0, 500) || 'No stack trace'}\`\`\``,
          },
        ],
      },
    ],
  };

  await sendSlackMessage(message);
}

/**
 * Send error rate alert
 */
export async function sendErrorRateAlert(
  errorRate: number,
  threshold: number = 1
): Promise<void> {
  const message: SlackMessage = {
    text: `🚨 Error Rate Alert - AstroNemi`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 High Error Rate Detected',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Current Error Rate:*\n${errorRate.toFixed(2)}%`,
          },
          {
            type: 'mrkdwn',
            text: `*Threshold:*\n${threshold}%`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'The error rate has exceeded the configured threshold. Please investigate immediately.',
        },
      },
    ],
  };

  await sendSlackMessage(message);
}

/**
 * Send payment failure alert
 */
export async function sendPaymentFailureAlert(
  orderId: string,
  amount: number,
  error: string
): Promise<void> {
  const message: SlackMessage = {
    text: `💳 Payment Failure Alert - AstroNemi`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💳 Payment Failed',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Order ID:*\n${orderId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Amount:*\n₹${(amount / 100).toFixed(2)}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n\`${error}\``,
        },
      },
    ],
  };

  await sendSlackMessage(message);
}

/**
 * Send system health alert
 */
export async function sendHealthAlert(
  metric: string,
  value: number,
  threshold: number
): Promise<void> {
  const message: SlackMessage = {
    text: `🏥 System Health Alert - AstroNemi`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🏥 System Health Alert',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Metric:*\n${metric}`,
          },
          {
            type: 'mrkdwn',
            text: `*Current Value:*\n${value.toFixed(2)}`,
          },
        ],
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Threshold:*\n${threshold}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n⚠️ Exceeded`,
          },
        ],
      },
    ],
  };

  await sendSlackMessage(message);
}

/**
 * Send deployment notification
 */
export async function sendDeploymentNotification(
  version: string,
  environment: string,
  status: 'success' | 'failed'
): Promise<void> {
  const emoji = status === 'success' ? '✅' : '❌';
  const message: SlackMessage = {
    text: `${emoji} Deployment ${status === 'success' ? 'Successful' : 'Failed'} - AstroNemi`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Deployment ${status === 'success' ? 'Successful' : 'Failed'}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Version:*\n${version}`,
          },
          {
            type: 'mrkdwn',
            text: `*Environment:*\n${environment}`,
          },
        ],
      },
    ],
  };

  await sendSlackMessage(message);
}

export default {
  sendMessage: sendSlackMessage,
  sendErrorAlert,
  sendErrorRateAlert,
  sendPaymentFailureAlert,
  sendHealthAlert,
  sendDeploymentNotification,
};