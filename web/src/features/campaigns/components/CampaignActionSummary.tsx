import React, { useState } from 'react';
import { Button, Card, Input, Typography, Modal } from 'antd';

const { Title, Paragraph } = Typography;

const selectedPlatforms = [
  {
    name: 'LinkedIn',
    actions: [
      {
        label: 'Visit profile',
        description: 'Automatically visits the user’s LinkedIn profile to increase visibility.'
      },
      {
        label: 'Follow profile',
        description: 'Follows the user’s profile to stay updated with their posts.'
      },
      {
        label: 'Send connection request',
        description: 'Sends a personalized connection request.'
      },
      {
        label: 'Send message (after accepted)',
        description: 'Sends a message once the connection request is accepted.'
      }
    ]
  },
  {
    name: 'WhatsApp',
    actions: [
      {
        label: 'Send broadcast',
        description: 'Sends a broadcast message to multiple recipients.'
      },
      {
        label: 'Send 1:1 message',
        description: 'Sends a personalized message to a single recipient.'
      },
      {
        label: 'Follow-up message',
        description: 'Sends a follow-up message after initial contact.'
      },
      {
        label: 'Template message',
        description: 'Sends a pre-approved template message.'
      }
    ]
  },
  {
    name: 'Voice Calls',
    actions: [
      {
        label: 'Call script',
        description: 'Initiates a voice call using a provided script.'
      }
    ]
  }
];

const CampaignActionSummary = () => {
  const [whatsAppTemplate, setWhatsAppTemplate] = useState('');
  const [voiceCallScript, setVoiceCallScript] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);

  const handlePreview = () => setPreviewVisible(true);
  const handleModalClose = () => setPreviewVisible(false);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <Title level={2}>Campaign Actions Overview</Title>
      {selectedPlatforms.map(platform => (
        <Card key={platform.name} title={platform.name} style={{ marginBottom: 16 }}>
          {platform.actions.map(action => (
            <div key={action.label} style={{ marginBottom: 8 }}>
              <b>{action.label}:</b> <span>{action.description}</span>
            </div>
          ))}
        </Card>
      ))}
      <Card title="WhatsApp Message Template" style={{ marginBottom: 16 }}>
        <Paragraph>Enter the message template to be used for WhatsApp outreach:</Paragraph>
        <Input.TextArea
          rows={4}
          value={whatsAppTemplate}
          onChange={e => setWhatsAppTemplate(e.target.value)}
          placeholder="Type your WhatsApp message template here..."
        />
      </Card>
      <Card title="Voice Call Script" style={{ marginBottom: 16 }}>
        <Paragraph>Enter the script to be used for voice calls:</Paragraph>
        <Input.TextArea
          rows={4}
          value={voiceCallScript}
          onChange={e => setVoiceCallScript(e.target.value)}
          placeholder="Type your voice call script here..."
        />
      </Card>
      <Button type="primary" onClick={handlePreview} style={{ marginTop: 16 }}>
        Preview Campaign
      </Button>
      <Modal
        title="Campaign Preview"
        visible={previewVisible}
        onCancel={handleModalClose}
        onOk={handleModalClose}
        okText="Confirm"
      >
        <Title level={4}>WhatsApp Message Template</Title>
        <Paragraph>{whatsAppTemplate || 'No template provided.'}</Paragraph>
        <Title level={4}>Voice Call Script</Title>
        <Paragraph>{voiceCallScript || 'No script provided.'}</Paragraph>
      </Modal>
    </div>
  );
};

export default CampaignActionSummary;
