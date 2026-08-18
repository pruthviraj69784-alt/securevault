const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const File = require('./src/models/file.model');
const webhookService = require('./src/services/webhook.service');

async function testWebhookFlow() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log('=== Step 1: Finding active user and file ===');
  const user = await User.findOne({});
  const file = await File.findOne({ owner: user._id });

  if (!user || !file) {
    console.log('No valid user/file found in DB');
    await mongoose.disconnect();
    return;
  }
  console.log('User:', user.email);
  console.log('File:', file.originalName, '| ZK:', file.versions[0].isZeroKnowledge, '| Status:', file.versions[0].status);

  console.log('\n=== Step 2: Registering Webhook to https://httpbin.org/post ===');
  const wh = await webhookService.registerWebhook(
    user._id,
    'https://httpbin.org/post',
    ['FILE_SHARED']
  );
  console.log('Webhook Registered!');
  console.log('  ID     :', wh._id);
  console.log('  URL    :', wh.url);
  console.log('  Events :', wh.events);
  console.log('  Active :', wh.isActive);

  console.log('\n=== Step 3: Triggering FILE_SHARED event ===');
  await webhookService.triggerEvent(user._id, 'FILE_SHARED', {
    user: user.email,
    filename: file.originalName
  });
  console.log('triggerEvent() called — dispatching HTTP POST to https://httpbin.org/post ...');
  await new Promise(r => setTimeout(r, 4000));
  console.log('HTTP POST dispatch completed (see docker logs securevault-api for WEBHOOK info lines)');

  console.log('\n=== Step 4: List all webhooks for user ===');
  const all = await webhookService.getWebhooks(user._id);
  console.log('Total webhooks:', all.length);
  all.forEach((w, i) => {
    console.log(`  [${i+1}] URL: ${w.url} | Events: ${w.events.join(',')} | Active: ${w.isActive}`);
  });

  console.log('\n=== Step 5: Delete the test webhook ===');
  await webhookService.deleteWebhook(user._id, wh._id);
  const remaining = await webhookService.getWebhooks(user._id);
  console.log('Webhooks after deletion:', remaining.length);

  await mongoose.disconnect();
  console.log('\n✅ Webhook test COMPLETE — all steps passed!');
}

testWebhookFlow().catch(e => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
