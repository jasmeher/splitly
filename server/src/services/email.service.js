export const sendEmail = async ({ to, subject, html }) => {
  console.log(`Sending email to ${to} with subject "${subject}"...`);
  return { success: true, messageId: 'mock-id' };
};
